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
const request = require('request-promise-native');
const merge = require('deepmerge');
const flatten = require('array-flatten');
const clone = require('clone');
const KubeResourceMeta = require('./KubeResourceMeta');

module.exports = class KubeClass {

  constructor(options) {
    this._baseOptions = merge({
      headers: {
        Accept: 'application/json'
      },
      json: true,
      simple: false,
      resolveWithFullResponse: true
    }, options);
  }

  async getCoreApis() {
    let coreApiList = await request.get('/api/v1', this._baseOptions);
    let apiResourceList = coreApiList.body;
    let resourceMetaList = apiResourceList.resources;
    let result = resourceMetaList.map(r => new KubeResourceMeta(`/api/${apiResourceList.groupVersion}`, r));

    return result;
  }


  async getApis() {
    let apiQuery = await request.get('/apis', this._baseOptions);
    let apisGroups = apiQuery.body;
    let apiList = await Promise.all(apisGroups.groups.map(async (group) => {
      if (group.preferredVersion && group.preferredVersion.groupVersion) {
        let response = await request.get('/apis/' + group.preferredVersion.groupVersion, this._baseOptions);
        let result = [];
        switch (response.statusCode) {
          case 200:
            {
              let rsp = response.body;
              if (rsp.kind === 'APIResourceList') {
                rsp.resources.map((e) => {
                  let t = new KubeResourceMeta(`/apis/${rsp.groupVersion}`, e);
                  result.push(t);
                });
              }
            }
            break;
          default:
            return Promise.reject({ statusCode: response.statusCode, body: response.body });
        }
        return result;
      }
    }));
    apiList = flatten.depth(apiList, 1);
    apiList = apiList.filter(api => api !== undefined);
    return apiList;
  }


  async getResource(resourceMeta, queryParams = {}) {
    let result;
    if (!resourceMeta) {
      return result;
    }
    result = {
      'resource-metadata': resourceMeta
    };
    let options = merge({ qs: queryParams }, this._baseOptions);
    let response = await request.get(resourceMeta.uri, options);
    result.statusCode = response.statusCode;
    switch (response.statusCode) {
      case 200:
        result.object = response.body;
        break;
      default:
        result.error = response.body;
    }
    return result;
  }

  async getResources(resourcesMeta, queryParams) {
    let result = await Promise.all(resourcesMeta.map(async (resourceMeta) => {
      return await this.getResource(resourceMeta, queryParams);
    }));
    return result;
  }

  async getResourcesPaged(resourcesMeta, queryParams = {}, next = undefined) {
    let result = {};
    if (queryParams.limit === undefined && next === undefined) {
      let resources = await this.getResources(resourcesMeta, queryParams);
      result.resources = resources;
    } else {
      next = next || { idx: 0 };
      queryParams = clone(queryParams, false);
      queryParams.continue = next.continue;
      let resource = await this.getResource(resourcesMeta[next.idx], queryParams);
      // console.dir(resource,{depth:null});
      if (resource.statusCode === 200) {
        next.continue = resource.object.metadata.continue;
      }
      result.resources = [resource];
      if (!next.continue || next.continue === '') {
        next.idx++;
      }
      if (next.idx < resourcesMeta.length) {
        result.next = next;
      }
    }
    return result;
  }


  async getKubeResourcesMeta(verb) {
    var [core, apis] = await Promise.all([this.getCoreApis(), this.getApis()]);

    var apisNameHash = {};
    apis.map((api) => {
      if (apisNameHash[api.name] === undefined || apisNameHash[api.name].uri.startsWith('/apis/extensions/')) {
        apisNameHash[api.name] = api;
      }
    });
    apis = Object.values(apisNameHash);

    var result = core.concat(apis);
    if (verb) {
      result = result.filter(r => r.hasVerb(verb));
    }
    return result;
  }

  async getSingleKubeResourcesMeta(path, resource, verb) {
    let singleGroupList = await request.get(path, this._baseOptions);
    let apiResourceList = singleGroupList.body;
    let resourceMetaList = apiResourceList.resources;
    let result;
    resourceMetaList.map(r => {
      if (r.name == resource || r.singularName == resource || r.kind == resource) {
        result = new KubeResourceMeta(path, r);
      }
    });
    if (verb && !result.hasVerb(verb)) {
      result = undefined;
    }
    return result;
  }

};
