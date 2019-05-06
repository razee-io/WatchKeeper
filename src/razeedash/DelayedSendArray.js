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
var validUrl = require('valid-url');
var requestretry = require('requestretry');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const log = require('../bunyan-api').createLogger('DelayedSendArray');


const httpsAgent = new HttpsAgent({
  keepAlive: true
});
const httpAgent = new HttpAgent({
  keepAlive: true
});


const _queueObject = Symbol('queueObject');

module.exports = class DelayedSendArray {

  constructor(url, clusterID, max) {
    this._clusterID = clusterID;
    this.url = url;
    if (url.startsWith('https')) {
      this.agent = httpsAgent;
    } else {
      this.agent = httpAgent;
    }
    this.sendObject = [];
    if (Number.isInteger(max)) {
      this._maxItems = max;
    } else {
      this._maxItems = 50;
    }
    if (!validUrl.isUri(url)) {
      throw Error(`${url} not valid.`);
    }
    if (!this._clusterID) {
      throw Error('clusterID must be defined');
    }
  }

  get maxItems() {
    return this._maxItems;
  }

  // private methods
  [_queueObject](o) {
    if (o.constructor === {}.constructor) {
      this.sendObject.push(o);
      if (this.sendObject.length >= this.maxItems) {
        this.flush();
      }
      return this.sendObject.length;
    } else {
      let type = typeof o;
      throw `Type ${type} not supported.`;
    }
  }

  // public methods
  send(o) {
    var result = 0;
    let sendObjectLength = 0;
    if (Array.isArray(o)) {
      o.forEach((e) => { sendObjectLength = this[_queueObject](e); });
      result = o.length;
    } else {
      sendObjectLength = this[_queueObject](o);
      result += 1;
    }
    if (sendObjectLength > 0 && !this.flushTimeout) {
      this.flushTimeout = setTimeout(() => {
        this.flush();
      }, 1000);
    }
    return result;
  }

  flush() {
    clearTimeout(this.flushTimeout);
    this.flushTimeout = undefined;
    var result = 0;
    if (this.sendObject.length > 0) {
      let outBoundArray = this.sendObject;
      this.sendObject = [];
      result = outBoundArray.length;
      let httpMethod = 'POST';
      this.httpCall(httpMethod, outBoundArray);
      return result;
    }
    return result;
  }

  async httpCall(httpMethod, data, options = {}) {
    let url = `${this.url}/clusters/${this._clusterID}/resources`;
    return requestretry({
      url: url,
      method: httpMethod,
      agent: this.agent,
      headers: {
        'razee-org-key': process.env.RAZEEDASH_ORG_KEY
      },
      json: true,
      body: data,

      maxAttempts: options.maxAttempts || 5, // (default) try 5 times
      retryDelay: options.retryDelay || 5000, // (default) wait for 5s before trying again
      retryStrategy: options.retryStrategy || requestretry.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
    }).then(function (response) {
      if (response.statusCode == 200) {
        let numSent = Array.isArray(data) ? data.length : 1;
        log.info(`${httpMethod} ${numSent} resource(s) to razeedash successful`);
        return numSent;
      } else {
        log.error(`${httpMethod} ${url} to razeedash failed: ${response.statusCode}`);
        return 0;
      }
    }).catch(err => { log.error(err); return err; });
  }
};
