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
const fs = require('fs-extra');

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

async function readJsonFile(path) {
  if (await fs.pathExists(path)) {
    try {
      return await fs.readJson(path);
    } catch (e) {
      log.error(e);
    }
  }
  return;
}

function listContains(list, ...search) {
  for (var i = 0; i < list.length; i++) {
    for (var j = 0; j < search.length; j++) {
      if (list[i].toLowerCase() == search[j].toLowerCase()) {
        return true;
      }
    }

  }
  return false;
}

async function selectiveListTrim(metaResources, whitelist, blacklist) {
  if (!whitelist && !blacklist) {
    return metaResources;
  }

  let result = [];
  metaResources.map(mr => {
    let apiVersion = mr.path.replace(/\/(api)s?\//, '');
    let kind = mr.kind;
    let name = mr.name;

    if (!name.endsWith('/status')) {
      if (whitelist) {
        if (Array.isArray(whitelist[apiVersion]) && listContains(whitelist[apiVersion], kind, name)) {
          result.push(mr);
        }
      } else if (blacklist) {
        if (!(Array.isArray(blacklist[apiVersion]) && listContains(blacklist[apiVersion], kind, name))) {
          result.push(mr);
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
  metaResources = await selectiveListTrim(metaResources, await readJsonFile('limit-poll/whitelist.json'), await readJsonFile('limit-poll/blacklist.json'));

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
  } catch (e) {
    util.error(`Error querying Kubernetes resources supporting 'get' verb. ${e}`);
    return false;
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
  if (await fs.pathExists('non-namespaced/poll')) {
    let nonNsPoll = (await fs.readFile('non-namespaced/poll', 'utf8')).trim();
    if (nonNsPoll != 'false') {
      success = success && await handleNonNamespaced(metaResources, razeedashSender, { limit: 500 },
        (o) => !objectPath.has(o, 'metadata.namespace') ? resourceFormatter(o, nonNsPoll) : undefined);
    }
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
