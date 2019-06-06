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

async function validateWatches(watchableResource) {
  let watchable = watchableResource.object;
  // let kind = watchable.kind.substring(0, watchable.kind.length - 4); //prune 'List' from the list kind to get the resource kind
  let selfLink = objectPath.get(watchable, 'metadata.selfLink');
  let apiVersion = objectPath.get(watchable, 'apiVersion');
  objectPath.set(watchable, 'metadata.selfLink', selfLink.replace(apiVersion, `${apiVersion}/watch`));

  if (watchable.items.length === 0 && (watchable.metadata.continue === undefined || watchable.metadata.continue === '')) {
    WatchManager.removeWatch(objectPath.get(watchable, 'metadata.selfLink'));
  } else {
    watchResource(watchable);
  }
}

function watchResource(watchable) {
  let options = {
    logger: require('../bunyan-api').createLogger('Watchman'),
    requestOptions: KubeApiConfig,
    watchable: watchable
  };
  options.requestOptions.qs = { labelSelector: `razee/watch-resource in (true,debug,${Util.liteSynonyms()},${Util.detailSynonyms()})` };
  WatchManager.ensureWatch(options, (data) => {
    Util.prepObject2Send(data);
    util.dsa.send(data);
  });
}

function removeAllWatches() {
  return WatchManager.removeAllWatches();
}

async function watch() {
  log.info('Validating Watches ============');
  let success = true;
  util = util || await Util.fetch();
  let resourcesMeta = await kc.getKubeResourcesMeta('watch');
  let selector = { labelSelector: `razee/watch-resource in (true,debug,${Util.liteSynonyms()},${Util.detailSynonyms()})`, limit: 500 };
  try {
    for (var i = 0; i < resourcesMeta.length; i++) {
      let resource = await kc.getResource(resourcesMeta[i], selector);
      if (resource.statusCode === 200) {
        await validateWatches(resource);
      }
    }
  } catch (e) {
    util.error(`Could not handle selector. ${JSON.stringify(selector)}`, e);
    success = false;
  }
  return success;
}

module.exports = {
  watch,
  removeAllWatches
};
