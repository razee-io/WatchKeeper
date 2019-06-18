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

const { Watchman } = require('@razee/kubernetes-util');
const log = require('../bunyan-api').createLogger('WatchManager');

var _watchObjects = {};

module.exports = function WatchManager() {
  // private
  let _saveWatch = function (wm, startWatch = true) {
    let selfLink = wm.selfLink;
    _removeWatch(selfLink);
    _watchObjects[selfLink] = wm;
    if (startWatch) {
      _watchObjects[selfLink].watch();
    }
    log.info(`Watch added: ${selfLink}`);
    return _watchObjects[selfLink];
  };

  let _ensureWatch = function (options, objectHandler, startWatch = true) {
    let w = _getWatch(options.watchUri);
    if (w) {
      return w;
    }
    var wm = new Watchman(options, objectHandler);
    return _saveWatch(wm, startWatch);
  };

  let _startWatch = function (selfLink) {
    return _reWatch(selfLink);
  };

  let _removeWatch = function (selfLink) {
    let w = _getWatch(selfLink);
    if (w) {
      w.end();
      delete _watchObjects[selfLink];
      log.info(`Watch removed: ${selfLink}`);
    }
    return _watchObjects[selfLink];
  };

  let _getWatch = function (selfLink) {
    return _watchObjects[selfLink];
  };

  let _reWatch = function (selfLink) {
    let w = _getWatch(selfLink);
    if (w) {
      w.watch();
    }
    return w;
  };

  // public
  return {
    saveWatch: _saveWatch,
    ensureWatch: _ensureWatch,
    startWatch: _startWatch,
    removeWatch: _removeWatch,
    removeAllWatches: function () {
      let watches = Object.keys(_watchObjects);
      watches.forEach(w => _removeWatch(w));
    },
    getWatch: _getWatch,
    getAllWatches: function () {
      return _watchObjects;
    },
    reWatch: _reWatch,
    reWatchAll: function () {
      let watches = Object.keys(_watchObjects);
      watches.forEach(w => _reWatch(w));
    }
  };
};
