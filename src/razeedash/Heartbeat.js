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
const validUrl = require('valid-url');
const RequestLib = require('@razee/request-util');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const log = require('../bunyan-api').createLogger('Heartbeat');
const Config = require('../Config');
const Util = require('./Util');

const httpsAgent = new HttpsAgent({
  keepAlive: true
});
const httpAgent = new HttpAgent({
  keepAlive: true
});

module.exports = class Heartbeat {

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
    if (!this._clusterID) {
      throw Error('clusterID must be defined');
    }
  }

  async heartbeat(customMeta) {
    log.info('Sending Heartbeat ============');

    let orgKey;
    try {
      orgKey = await Util.getOrgKey();
    }
    catch(e) {
      orgKey = Config.orgKey;
    }

    return RequestLib.doRequest({
      url: `${this.url}/clusters/${this._clusterID}`,
      method: 'POST',
      agent: this.agent,
      headers: {
        'razee-org-key': orgKey
      },
      json: true,
      body: customMeta,
      simple: false,
      resolveWithFullResponse: true
    }, log).then(function (res) {
      if (res.statusCode == 200) {
        return false;
      } else if (res.statusCode == 205) {
        return true;
      } else {
        log.error(`POST heartbeat to razeedash failed: ${res.url}, ${res.statusCode}`);
        return false;
      }
    }).catch(err => {
      log.error(err);
      return false;
    });
  }
};
