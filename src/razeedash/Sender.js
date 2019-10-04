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
var objectPath = require('object-path');

const DelayedSendArray = require('./DelayedSendArray');
const log = require('../bunyan-api').createLogger('Sender');

module.exports = class RazeedashSender {

  constructor(clusterID) {
    this._dsa = new DelayedSendArray(process.env.RAZEEDASH_URL || 'http://localhost:3000/api/v2', clusterID, undefined, true);
    this._sentSelflinks = {};
  }


  // public methods
  get maxItems() {
    return this._dsa.maxItems;
  }

  get resourceCount() {
    return Object.keys(this._sentSelflinks).length;
  }


  send(o) {
    log.debug('send', JSON.stringify(o));
    if (!Array.isArray(o)) {
      o = [o];
    }
    o = this._distill(o);
    let result = this._dsa.send(o);
    return result;
  }


  reset() {
    this._sentSelflinks = {};
  }

  async sendPollComplete() {
    let gcObject = {
      type: 'SYNC',
      count: this.resourceCount
    };

    this.flush();
    await Promise.all(this._dsa.getSendPromises());
    let result = await this._dsa.httpCall('POST', gcObject, { endpoint: 'resources/sync' });
    if (result.statusCode === 404) {
      log.debug('New SYNC endpoint not found.. sending selfLinks array to old endpoint');
      gcObject = [{
        type: 'SYNC',
        object: Object.keys(this._sentSelflinks)
      }];
      result = await this._dsa.httpCall('POST', gcObject);
    }
    this.reset();
    return result;
  }

  // only send resources (as identified by selfLink) once and then filter others
  _distill(...resourceArrays) {
    let result = [];
    resourceArrays.forEach((a) => {
      a.forEach((e) => {
        if (e) {
          let selfLink = objectPath.get(e, 'object.metadata.selfLink');
          if (selfLink && !this._sentSelflinks[selfLink]) {
            this._sentSelflinks[selfLink] = true;
            result.push(e);
          }
        }
      });
    });
    return result;
  }


  flush() {
    return this._dsa.flush();
  }

};
