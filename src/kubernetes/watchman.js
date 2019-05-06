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

const request = require('request');
const validUrl = require('valid-url');
const JSONStream = require('JSONStream');
const delay = require('delay');
const merge = require('deepmerge');
const objectPath = require('object-path');

module.exports = class Watchman {
  constructor(options, objectHandler) {
    if ((typeof objectHandler) !== 'function') {
      throw 'objectHandler must be a function.';
    }
    this._objectHandler = objectHandler;
    this._requestOptions = merge({
      headers: {
        'User-Agent': 'razee-watchman'
      },
      json: true, // Automatically parses the JSON string in the response
      resolveWithFullResponse: true,
      simple: false
    }, options.requestOptions || {});
    this._requestOptions.uri = objectPath.get(options.watchable, 'metadata.selfLink');

    if ((typeof objectHandler) !== 'function') {
      throw 'objectHandler must be a function.';
    }
    if ((options.logger) && ((typeof options.logger) !== 'object')) {
      throw 'options.logger must be an object.';
    }
    this._logger = options.logger;
    if (!validUrl.isUri(`${this._requestOptions.baseUrl}${this._requestOptions.uri}`)) {
      throw `uri '${this._requestOptions.baseUrl}${this._requestOptions.uri}' not valid.`;
    }

    this._rewatchOnTimeout = options.rewatchOnTimeout || true;
    this._requestStream = undefined;
    this._jsonStream = undefined;
    this._errors = 0;
    this._watching = false;
  }

  //private methods
  get selfLink() {
    return this._requestOptions.uri;
  }
  get logger() {
    return this._logger;
  }
  get objectHandler() {
    return this._objectHandler;
  }
  get watching() {
    return this._watching;
  }

  _watchError() {
    this._errors++;
    this.end(this._rewatchOnTimeout);
    delay(this._errors * 1000).then(() => {
      this.watch();
    });
  }

  // public methods
  watch() {
    this.end(this._rewatchOnTimeout);
    this._requestStream = request(this._requestOptions)
      .on('response', (response) => {
        if (response.statusCode !== 200) {
          if (this._logger) {
            this._logger.error(`GET ${this._requestOptions.uri} returned ${response.statusCode}`);
          }
          this._watchError();
        } else {
          this._watching = true;
          this._errors = 0;
        }
      })
      .on('error', (err) => {
        if (this._logger) {
          this._logger.error(`GET ${this._requestOptions.uri} errored`, err);
        }
        this._watchError();
      })
      .on('close', () => {
        this._watching = false;
        if (this._rewatchOnTimeout && this._errors == 0) {
          this.watch();
        }
      });

    var parser = JSONStream.parse(true);
    parser.on('data', (data) => {
      if (data.type === 'ERROR') {
        if (this._logger) {
          this._logger.error(`GET ${this._requestOptions.uri} errored`, JSON.stringify(data.object));
        }
        this._watchError();
      } else {
        this.objectHandler(data);
      }
    });
    parser.on('error', (err) => {
      if (this._logger) {
        this._logger.error(`GET ${this._requestOptions.uri} errored`, err);
      }
      this._watchError();
    });
    this._jsonStream = this._requestStream.pipe(parser);
  }

  end(rewatchOnTimeout = false) {
    this._watching = false;
    this._rewatchOnTimeout = rewatchOnTimeout;
    if (this._requestStream) {
      this._requestStream.abort();
    }
    this._requestStream = undefined;
    this._jsonStream = undefined;
  }
};
