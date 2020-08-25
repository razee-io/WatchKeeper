/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const objectPath = require('object-path');

const log = require('../bunyan-api').createLogger('Watch');
const WatchManager = require('../kubernetes/WatchManager')();

const { KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
var kc = new KubeClass(KubeApiConfig());
const Util = require('./Util');
var util;

async function validateWatches(watchableKrm, itemsLength, resourceContinue) {
  if (itemsLength === 0 && (resourceContinue === undefined || resourceContinue === '')) {
    WatchManager.removeWatch(watchableKrm.uri({ watch: true }));
  } else {
    let querySelector = { labelSelector: `razee/watch-resource in (true,debug,${Util.liteSynonyms()},${Util.detailSynonyms()})` };
    createWatch(watchableKrm, querySelector);
  }
}

function createWatch(watchableKrm, querySelector = {}, detailLevel, globalWatch = false) {
  let options = {
    logger: require('../bunyan-api').createLogger('Watchman'),
    requestOptions: KubeApiConfig(),
    watchUri: watchableKrm.uri({ watch: true })
  };
  options.requestOptions.qs = querySelector;
  WatchManager.ensureWatch(options, (eventObj) => {
    let metadata = { name: objectPath.get(eventObj, 'object.metadata.name'), namespace: objectPath.get(eventObj, 'object.metadata.namespace') };
    objectPath.set(eventObj, 'object.metadata.annotations.selfLink', watchableKrm.uri(metadata));

    let preppedEventObj = Util.prepObject2Send(eventObj, detailLevel);
    util.dsa.send(preppedEventObj);
  }, globalWatch);
}

function removeAllWatches() {
  return WatchManager.removeAllWatches();
}

async function watch() {
  log.info('Validating Watches ============');
  let success = true;
  // eslint-disable-next-line require-atomic-updates
  util = util || await Util.fetch();
  let clusterWideWatch = await Util.walkConfigMap('watch-keeper-non-namespaced', ['poll']);
  let resourcesMeta = await kc.getKubeResourcesMeta('watch');

  try {
    for (var i = 0; i < resourcesMeta.length; i++) {
      let krm = resourcesMeta[i];
      let apiVersion = krm.path.replace(/\/(api)s?\//, '').replace(/\//g, '_');
      let kind = krm.kind.replace(/\//g, '_');
      let name = krm.name.replace(/\//g, '_');

      let detailLevel = Util.objIncludes(clusterWideWatch, `${apiVersion}_${kind}`, `${apiVersion}_${name}`).value;
      if (detailLevel) {
        let globalWatch = true;
        let qs = {};
        createWatch(krm, qs, detailLevel, globalWatch);
      } else {
        let resource = await kc.getResource(resourcesMeta[i], { labelSelector: `razee/watch-resource in (true,debug,${Util.liteSynonyms()},${Util.detailSynonyms()})`, limit: 500 });
        if (resource.statusCode === 200) {
          await validateWatches(resourcesMeta[i], objectPath.get(resource, 'object.items.length', 0), objectPath.get(resource, 'object.metadata.continue'));
        }
      }
    }
  } catch (e) {
    util.error('Could not validate watches.', e);
    success = false;
  }
  return success;
}

module.exports = {
  watch,
  removeAllWatches
};
