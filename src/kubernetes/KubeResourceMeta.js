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
module.exports = class KubeResourceMeta {
  constructor(path, rm) {
    this._path = path;
    this._resourceMeta = rm;
  }

  get uri() {
    let result = `${this._path}/${this._resourceMeta.name}`;
    return result;
  }
  get name() {
    return this._resourceMeta.name;
  }
  get singularName() {
    return this._resourceMeta.singularName;
  }
  get namespaced() {
    return this._resourceMeta.namespaced;
  }
  get kind() {
    return this._resourceMeta.kind;
  }
  get verbs() {
    return this._resourceMeta.verbs;
  }

  hasVerb(verb) {
    return this.verbs.some(v => verb == v);
  }

};
