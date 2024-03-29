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
const bunyan = require('bunyan');
const Config = require('./Config');

module.exports = {
  'createLogger': function (name) {
    try {
      return bunyan.createLogger({
        name: name || 'watch-keeper',
        streams: [{
          level: (Config.logLevel || 'info'),
          stream: process.stdout // log LOG_LEVEL and above to stdout
        }],
        serializers: bunyan.stdSerializers
      });
    } catch (err) {
      // unknown log level given, default to info
      return bunyan.createLogger({
        name: name || 'watch-keeper',
        streams: [{
          level: ('info'),
          stream: process.stdout // log level and above to stdout
        }],
        serializers: bunyan.stdSerializers
      });
    }
  }
};
