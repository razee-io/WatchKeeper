/**
* Copyright 2019, 2023 IBM Corp. All Rights Reserved.
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
const RequestLib = require('@razee/request-util');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const validUrl = require('valid-url');
const Config = require('../Config');
const Util = require('./Util');

const httpsAgent = new HttpsAgent({
  keepAlive: true
});
const httpAgent = new HttpAgent({
  keepAlive: true
});

module.exports = class Messenger {

  constructor(url, clusterID) {
    this._clusterID = clusterID;
    this.url = url;
    if (url.startsWith('https')) {
      this.agent = httpsAgent;
    } else {
      this.agent = httpAgent;
    }
    if (!validUrl.isUri(url)) {
      throw Error(`${url} not valid.`);
    }
  }

  error(msg, obj = {}) {
    return this.message('ERROR', msg, obj);
  }

  warn(msg, obj = {}) {
    return this.message('WARN', msg, obj);
  }

  info(msg, obj = {}) {
    return this.message('INFO', msg, obj);
  }

  // lvl: level of message [error, warn, info, etc..]
  // msg: string
  // data: optional data object
  async message(lvl, msg, data = {}, options = {}) {
    let body = {
      level: lvl,
      message: msg,
      data: data
    };
    let url = this._clusterID ? `${this.url}/clusters/${this._clusterID}/messages` : `${this.url}/messages`;

    let orgKey;
    try {
      orgKey = await Util.getOrgKey();
    }
    catch(e) {
      orgKey = Config.orgKey;
    }

    return RequestLib.doRequestRetry({
      url: url,
      method: 'POST',
      agent: this.agent,
      headers: {
        'razee-org-key': orgKey
      },
      json: true,
      body: body,

      maxAttempts: options.maxAttempts || 5, // (default) try 5 times
      retryDelay: options.retryDelay || 5000, // (default) wait for 5s before trying again
    });
  }
};
