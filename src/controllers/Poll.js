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
const KubeApiConfig = require('../kubernetes/KubeApiConfig')();
const KubeClass = require('../kubernetes/kubeClass');
const kc = new KubeClass(KubeApiConfig);
const Util = require('./Util');
const RazeedashSender = require('../razeedash/Sender');
var util;


function createPolledResource(resourceList, resourceFormatter) {
  var resources = [];
  if (resourceList && resourceList.items && resourceList.items.length > 0) {
    let kind = resourceList.kind.substring(0, resourceList.kind.length - 4); //prune 'List' from the list kind to get the resource kind
    let apiVersion = resourceList.apiVersion;
    resourceList.items.map(resource => {
      resource.kind = resource.kind || kind;
      resource.apiVersion = resource.apiVersion || apiVersion;
      resource = resourceFormatter(resource);
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
  util = util || await Util.fetch();
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
    uri: '/api/v1/namespaces'
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
        let response = await handleSelector(metaResources, razeedashSender, { fieldSelector: `metadata.namespace==${namespaces[i]}`, export: 'true', limit: selector.limit }, formatter);
        success = (success && response);
      }
    } while (next);
  } catch (e) {
    util.error('Could not handle watched namespaces.', e);
    success = false;
  }

  return success;
}


function liteResourceFormatter(o) {
  let result;
  if (objectPath.get(o, 'metadata.namespace', null)!==null) {
    result = {};
    result.kind = o.kind;
    result.apiVersion = o.apiVersion;
    result.metadata = objectPath.get(o, 'metadata');
    if (objectPath.has(o, 'status')) {
      result.status = objectPath.get(o, 'status');
    }
    Util.prepObject2Send(result);
  }
  return result;
}

function detailedResourceFormatter(o) {
  if (Util.hasLabel(o, 'razee/watch-resource')) {
    Util.prepObject2Send(o);
  }
  return o;
}

async function trimMetaResources(metaResources) {
  util = util || await Util.fetch();
  let selector = { limit: 500 };
  let result = [];
  for (var i = 0; i < metaResources.length; i++) {
    let resource = await kc.getResource(metaResources[i], selector);

    let cont = objectPath.get(resource, 'object.metadata.continue');
    if (resource.statusCode === 200 && (objectPath.get(resource, 'object.items', []).length > 0 || (cont !== undefined && cont !== ''))) {
      result.push(metaResources[i]);
    }
  }
  return result;
}


async function poll() {
  let metaResources;
  let success = true;
  util = util || await Util.fetch();
  log.info('Polling Resources ============');
  let razeedashSender = new RazeedashSender(util.dsa);
  try {
    metaResources = await kc.getKubeResourcesMeta('get');
    metaResources = await trimMetaResources(metaResources);
  } catch (e) {
    util.error(`Error querying Kubernetes resources supporting 'get' verb. ${e}`);
    return false;
  }
  // must be run asynchronously, sequentially, and in order of declining detail
  // Send singlely labeled unaltered resource
  success = success && await handleSelector(metaResources, razeedashSender, { labelSelector: 'razee/watch-resource in (debug)', limit: 500 }, (o) => { return Util.hasLabel(o, 'razee/watch-resource') ? o : undefined; });
  // Send singlely labeled detailed resource
  success = success && await handleSelector(metaResources, razeedashSender, { labelSelector: `razee/watch-resource in (true,${Util.detailSynonyms()})`, limit: 500 }, detailedResourceFormatter);
  // Send all resources detailed within the labeled namespace
  success = success && await handleWatchedNamespaces(metaResources, razeedashSender, { labelSelector: `razee/watch-resource in (${Util.detailSynonyms()})`, limit: 500 }, detailedResourceFormatter);
  // Send singlely labeled lite resource
  success = success && await handleSelector(metaResources, razeedashSender, { labelSelector: `razee/watch-resource in (${Util.liteSynonyms()})`, limit: 500 }, liteResourceFormatter);
  // Send all resources lite within the labeled namespace
  success = success && await handleWatchedNamespaces(metaResources, razeedashSender, { labelSelector: `razee/watch-resource in (true,${Util.liteSynonyms()})`, limit: 500 }, liteResourceFormatter);

  if (success) {
    razeedashSender.sendPollSummary();
  } else {
    log.error('Encountered error while polling. Not sending SYNC.');
  }
  log.info('Finished Polling Resources ============');
  return success;
}


module.exports = {
  poll
};
