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

const log = require('../bunyan-api').createLogger('Poll');

const { KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
const kc = new KubeClass(KubeApiConfig());
const Util = require('./Util');
const RazeedashSender = require('../razeedash/Sender');
var util;


function createPolledResource(resourceList, resFormatter) {
  var resources = [];
  if (resourceList && resourceList.items && resourceList.items.length > 0) {
    let kind = resourceList.kind.substring(0, resourceList.kind.length - 4); //prune 'List' from the list kind to get the resource kind
    let apiVersion = resourceList.apiVersion;
    resourceList.items.map(resource => {
      resource.kind = resource.kind || kind;
      resource.apiVersion = resource.apiVersion || apiVersion;
      resource = resFormatter(resource);
      if (resource) {
        let o = {
          type: 'POLLED',
          object: resource
        };
        resources.push(o);
      }
    });
  }
  return resources;
}


async function handleSelector(metaResources, razeedashSender, selector, formatter) {
  let success = true;
  try {
    let next = undefined;
    selector.limit = selector.limit || 500;
    do {
      let gr = await kc.getResourcesPaged(metaResources, selector, next);
      next = gr.next;
      gr.resources.map((r) => {
        if (r.statusCode === 200) {
          let o = createPolledResource(r.object, formatter);
          if (o.length > 0) {
            razeedashSender.send(o);
          }
        }
      });
    } while (next);
  } catch (e) {
    util.error(`Could not handle selector. ${JSON.stringify(selector)}`, e);
    success = false;
  }
  return success;
}


async function handleWatchedNamespaces(metaResources, razeedashSender, selector, formatter) {
  let success = true;
  metaResources = metaResources.filter(resource => { return resource.namespaced; });
  let resourceMeta = {
    uri: () => '/api/v1/namespaces'
  };
  try {
    let next = undefined;
    selector.limit = selector.limit || 500;
    do {
      let gr = await kc.getResourcesPaged([resourceMeta], selector, next);
      next = gr.next;
      let namespaces = gr.resources[0].object.items.map(resource => {
        return objectPath.get(resource, 'metadata.name');
      });
      gr = undefined;
      for (var i = 0; i < namespaces.length; i++) {
        let response = await handleSelector(metaResources, razeedashSender, { fieldSelector: `metadata.namespace==${namespaces[i]}`, export: 'true', limit: selector.limit },
          (o) => (objectPath.get(o, 'metadata.namespace') == namespaces[i]) ? formatter(o) : undefined);
        success = (success && response);
      }
    } while (next);
  } catch (e) {
    util.error('Could not handle watched namespaces.', e);
    success = false;
  }

  return success;
}

async function handleNonNamespaced(metaResources, razeedashSender, selector, formatter) {
  let success = true;

  let nonNsedKrms = metaResources.filter(krm => {
    return !krm.namespaced;
  });

  if (nonNsedKrms.length == 0) {
    return success;
  }

  try {
    let next = undefined;
    selector.limit = selector.limit || 500;
    do {
      let gr = await kc.getResourcesPaged(nonNsedKrms, selector, next);
      next = gr.next;
      gr.resources.map((r) => {
        if (r.statusCode === 200) {
          let o = createPolledResource(r.object, formatter);
          if (o.length > 0) {
            razeedashSender.send(o);
          }
        }
      });
    } while (next);
  } catch (e) {
    util.error('Could not handle non-namespaced.', e);
    success = false;
  }
  return success;
}

function resourceFormatter(o, level) {
  // prep object to send based on razee/watch-resource label. if label doesnt exist use level.
  let res = Util.prepObject2Send(o, level);
  return res;
}

async function readWBList() {
  let configNs = process.env.CONFIG_NAMESPACE || process.env.NAMESPACE || 'kube-system';
  let limitPollConfigMap = await Util.getConfigMap('watch-keeper-limit-poll', configNs);
  if (objectPath.has(limitPollConfigMap, 'data.whitelist') && objectPath.get(limitPollConfigMap, 'data.whitelist') === 'true') {
    let wlist = await Util.walkConfigMap('watch-keeper-limit-poll', ['whitelist.json', 'whitelist', 'blacklist.json', 'blacklist']);
    return { whitelist: wlist };

  } else if (objectPath.has(limitPollConfigMap, 'data.blacklist') && objectPath.get(limitPollConfigMap, 'data.blacklist') === 'true') {
    let blist = await Util.walkConfigMap('watch-keeper-limit-poll', ['whitelist.json', 'whitelist', 'blacklist.json', 'blacklist']);
    return { blacklist: blist };

  } else if (objectPath.has(limitPollConfigMap, ['data', 'whitelist.json'])) {
    try {
      let wlistJson = JSON.parse(objectPath.get(limitPollConfigMap, ['data', 'whitelist.json'], '{}'));
      let flattenedList = flattenJsonListObj(wlistJson);
      return { whitelist: flattenedList };
    } catch (e) {
      log.error(e);
    }

  } else if (objectPath.has(limitPollConfigMap, ['data', 'blacklist.json'])) {
    try {
      let blistJson = JSON.parse(objectPath.get(limitPollConfigMap, ['data', 'blacklist.json'], '{}'));
      let flattenedList = flattenJsonListObj(blistJson);
      return { blacklist: flattenedList };
    } catch (e) {
      log.error(e);
    }
  }
  return {};
}

function flattenJsonListObj(jsonObj) {
  let fileList = {};
  let apiVersions = Object.keys(jsonObj);
  for (let av of apiVersions) {
    let avStr = av.replace(/\//g, '_');
    jsonObj[av].forEach(el => fileList[`${avStr.toLowerCase()}_${el.replace(/\//g, '_').toLowerCase()}`] = 'true');
  }
  return fileList;
}

async function selectiveListTrim(metaResources) {
  let { whitelist, blacklist } = await readWBList();
  if (!whitelist && !blacklist) {
    return metaResources;
  }

  let result = [];
  metaResources.map(krm => {
    let apiVersion = krm.path.replace(/\/(api)s?\//, '').replace(/\//g, '_');
    let kind = krm.kind.replace(/\//g, '_');
    let name = krm.name.replace(/\//g, '_');

    if (!krm.name.endsWith('/status')) {
      if (whitelist) {
        if (Util.objIncludes(whitelist, `${apiVersion}_${kind}`, `${apiVersion}_${name}`).value === 'true') {
          result.push(krm);
        }
      } else if (blacklist) {
        if (!(Util.objIncludes(blacklist, `${apiVersion}_${kind}`, `${apiVersion}_${name}`).value === 'true')) {
          result.push(krm);
        }
      }
    }
  });
  return result;
}

// Run query for all known resource meta, remove from the list anything that
// doesnt have any resources on the system. This takes a while up front, but
// should save time for the rest of the calls
async function trimMetaResources(metaResources) {
  metaResources = await selectiveListTrim(metaResources);

  // eslint-disable-next-line require-atomic-updates
  util = util || await Util.fetch();
  let selector = { limit: 500 };
  let result = [];
  for (var i = 0; i < metaResources.length; i++) {
    if (!metaResources[i].name.endsWith('/status')) { // call to /status returns same data as call to plain endpoint. so no need to make call
      let resource = await kc.getResource(metaResources[i], selector);

      let cont = objectPath.get(resource, 'object.metadata.continue');
      if (resource.statusCode === 200 && (objectPath.get(resource, 'object.items', []).length > 0 || (cont !== undefined && cont !== ''))) {
        result.push(metaResources[i]);
      }
    }
  }
  return result;
}


async function poll() {
  let metaResources;
  let success = true;
  // eslint-disable-next-line require-atomic-updates
  util = util || await Util.fetch();
  log.info('Polling Resources ============');
  let razeedashSender = new RazeedashSender(util.clusterID);
  try {
    metaResources = await kc.getKubeResourcesMeta('get');
    metaResources = await trimMetaResources(metaResources);
    log.debug(`Polling against resources: ${JSON.stringify(metaResources.map(mr => mr.uri()))}`);
    if (metaResources.length < 1) {
      log.info('No resources found to poll (either due to no resources being labeled or white/black list configuration)');
      log.info('Finished Polling Resources ============');
      return success;
    }
  } catch (e) {
    util.error(`Error querying Kubernetes resources supporting 'get' verb. ${e}`);
    success = false;
    return success;
  }
  // must be run sequentially in order of declining detail. Razeedash sender keeps track of what it has sent,
  // and only sends the first instance.. so we want to send the most detailed things first.

  // Send singlely labeled resources
  success = success && await handleSelector(metaResources, razeedashSender, { labelSelector: `razee/watch-resource in (debug,true,${Util.liteSynonyms()},${Util.detailSynonyms()}})`, limit: 500 },
    (o) => Util.hasLabel(o, 'razee/watch-resource') ? resourceFormatter(o) : undefined);

  // For now we think its a bad idea to allow a whole ns to be detail tagged.
  // Send all resources lite within labeled namespaces
  success = success && await handleWatchedNamespaces(metaResources, razeedashSender, { labelSelector: `razee/watch-resource in (debug,true,${Util.liteSynonyms()},${Util.detailSynonyms()})`, limit: 500 },
    (o) => objectPath.has(o, 'metadata.namespace') ? resourceFormatter(o, 'lite') : undefined);

  // Send all non-namespaced resources
  let configNs = process.env.CONFIG_NAMESPACE || process.env.NAMESPACE || 'kube-system';
  let nonNsConfigMap = await Util.getConfigMap('watch-keeper-non-namespaced', configNs);
  if (objectPath.has(nonNsConfigMap, 'data.poll') && objectPath.get(nonNsConfigMap, 'data.poll') !== 'false') {
    success = success && await handleNonNamespaced(metaResources, razeedashSender, { limit: 500 },
      (o) => !objectPath.has(o, 'metadata.namespace') ? resourceFormatter(o, objectPath.get(nonNsConfigMap, 'data.poll')) : undefined);

  }

  if (success) {
    try {
      await razeedashSender.sendPollComplete();
    } catch (e) {
      log.error(`Encountered error while sending SYNC: ${e}`);
    }
  } else {
    log.error('Encountered error while polling. Not sending SYNC.');
  }
  log.info('Finished Polling Resources ============');
  return success;
}


module.exports = {
  poll
};
