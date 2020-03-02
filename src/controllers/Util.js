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
const hash = require('object-hash');

const { KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
var kc = new KubeClass(KubeApiConfig());
const DataCollector = require('./DataCollector');
var dc = new DataCollector(kc);

const DelayedSendArray = require('../razeedash/DelayedSendArray');
const Messenger = require('../razeedash/Messenger');
const Heartbeat = require('../razeedash/Heartbeat');
const log = require('../bunyan-api').createLogger('Util');

var util = {};

module.exports = class Util {

  constructor(razeedashUrl, clusterID) {
    this._clusterID = clusterID;
    this._url = razeedashUrl || process.env.RAZEEDASH_URL || 'http://localhost:3000/api/v2';
    this._dsa = new DelayedSendArray(this._url, clusterID);
    this._messenger = new Messenger(this._url, clusterID);
    this._heartbeat = new Heartbeat(this._url, clusterID);
    this._customMeta = {};
  }

  get clusterID() {
    return this._clusterID;
  }

  get razeedashUrl() {
    return this._url;
  }

  get dsa() {
    return this._dsa;
  }

  get messenger() {
    return this._messenger;
  }


  async heartbeat() {
    try {
      this._customMeta = await dc.getClusterMeta();
    } catch (e) {
      this.error('Error fetching custom cluster metadata.', e);
    }
    return this._heartbeat.heartbeat(this._customMeta);
  }

  async error(msg, err) {
    log.error(msg, err);
    try {
      let response = await this._messenger.error(msg, err);
      return response;
    } catch (err) {
      log.error(`failed to send error message ${err}`);
      return { statusCode: 500, body: err };
    }
  }

  async warn(msg, err) {
    log.warn(msg, err);
    try {
      let response = await this._messenger.warn(msg, err);
      return response;
    } catch (err) {
      log.error(`failed to send warn message ${err}`);
      return { statusCode: 500, body: err };
    }
  }

  async info(msg, err) {
    log.info(msg, err);
    try {
      let response = await this._messenger.info(msg, err);
      return response;
    } catch (err) {
      log.error(`failed to send info message ${err}`);
      return { statusCode: 500, body: err };
    }
  }
  // fetch - Get razeedash URL.  First one will be default URL unless def = true
  static async fetch(razeedashUrl, def = false) {
    if (!util[razeedashUrl]) {
      let clusterID = await dc.getClusterUid();
      log.debug(`ClusterID retrieved: ${clusterID}`);
      // eslint-disable-next-line require-atomic-updates
      util[razeedashUrl] = new Util(razeedashUrl, clusterID);
      if (!util[undefined] || def) {
        // eslint-disable-next-line require-atomic-updates
        util[undefined] = util[razeedashUrl];
      }
    }
    return util[razeedashUrl];
  }

  // addHash - will add object hash to attribute 'razeehash' if
  static addHash(o) {
    if (Array.isArray(o)) {
      o.forEach(Util.addHash);
    } else if (Array.isArray(o.items)) {
      o.items.forEach(Util.addHash);
    } else {
      let hashCode = hash(o);
      if (objectPath.has(o, 'type')) {
        objectPath.set(o, 'razeehash', hashCode);
      }
    }
    return o;
  }

  // prepObject2Send - strip/redact attributes and apply razeehash code if needed
  static prepObject2Send(o, level = 'lite') {
    if (Array.isArray(o)) {
      o.forEach(Util.prepObject2Send);
    } else if (Array.isArray(o.items)) {
      o.items.forEach(Util.prepObject2Send);
    } else if (o.object) {
      Util.prepObject2Send(o.object);
    } else {
      let labelLevel = objectPath.get(o, ['metadata', 'labels', 'razee/watch-resource'], level);
      if (labelLevel == 'debug') {
        return o;
      } else if (!Util.detailSynonyms().split(',').includes(labelLevel)) { // if labelLevel isnt in detailSynonyms, then treat as lite
        let result = {};
        result.kind = objectPath.get(o, 'kind');
        result.apiVersion = objectPath.get(o, 'apiVersion');
        result.metadata = objectPath.get(o, 'metadata');
        objectPath.has(o, 'status') ? objectPath.set(result, 'status', objectPath.get(o, 'status')) : undefined;
        o = result;
      }

      objectPath.del(o, ['metadata', 'annotations', 'kubectl.kubernetes.io/last-applied-configuration']);
      objectPath.del(o, ['metadata', 'annotations', 'kapitan.razee.io/last-applied-configuration']);
      objectPath.del(o, ['metadata', 'annotations', 'deploy.razee.io/last-applied-configuration']);
      if (objectPath.get(o, 'kind') === 'Secret' || objectPath.get(o, 'kind') === 'ConfigMap') { // secret or configmap
        let data = objectPath.get(o, 'data', {});
        let keys = Object.keys(data);
        keys.map(key => objectPath.set(o, ['data', key], 'REDACTED'));
      } else if (objectPath.get(o, 'kind') === 'Node') { // nodes
        objectPath.del(o, ['status', 'images']);
      } else if (objectPath.get(o, ['spec', 'template', 'spec', 'containers'])) { // most workloads.. ie Deployment, DaemonSet, StatefulSet, Job
        Util.clearContainerEnvs(objectPath.get(o, ['spec', 'template', 'spec', 'containers'], []));
      } else if (objectPath.get(o, ['spec', 'containers'])) { // pod
        Util.clearContainerEnvs(objectPath.get(o, ['spec', 'containers'], []));
      } else if (objectPath.get(o, ['spec', 'jobTemplate', 'spec', 'template', 'spec', 'containers'])) { // cronJob
        Util.clearContainerEnvs(objectPath.get(o, ['spec', 'jobTemplate', 'spec', 'template', 'spec', 'containers'], []));
      }
      Util.addHash(o);
    }
    return o;
  }

  static clearContainerEnvs(c) {
    if (Array.isArray(c)) {
      c.forEach(Util.clearContainerEnvs);
    } else {
      let envs = objectPath.get(c, 'env', []);
      envs.forEach(env => { if (env.value) { objectPath.set(env, 'value', 'REDACTED'); } });
      objectPath.set(c, 'env', envs);
    }
  }

  static hasLabel(o, l) {
    if (o.object) {
      return Util.hasLabel(o.object, l);
    } else {
      return objectPath.has(o, ['metadata', 'labels', l]);
    }
  }

  static liteSynonyms() {
    let synonyms = ['lite', 'Lite', 'light', 'brief'];
    return synonyms.toString();
  }

  static detailSynonyms() {
    let synonyms = ['heavy', 'detail', 'Detail', 'detailed'];
    return synonyms.toString();
  }

};
