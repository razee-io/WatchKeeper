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
const assert = require('chai').assert;
const KubeResourceMeta = require('../src/kubernetes/KubeResourceMeta');

describe('KubeResourceMeta', function () {
  var krm;
  beforeEach(() => {
    krm = new KubeResourceMeta('/app/v1', {
      'name': 'deployments',
      'singularName': 'deployment',
      'namespaced': true,
      'kind': 'Deployment',
      'verbs': ['watch']
    });
  });

  afterEach(() => {
    krm = undefined;
  });

  it('#getters', async () => {
    assert.strictEqual(krm.uri, '/app/v1/deployments');
    assert.strictEqual(krm.name, 'deployments');
    assert.strictEqual(krm.singularName, 'deployment');
    assert.strictEqual(krm.kind, 'Deployment');
    assert.deepEqual(krm.verbs, ['watch']);

    assert.isTrue(krm.namespaced, 'Test resource is namespaced.');
    assert.isTrue(krm.hasVerb('watch'), 'Test resource metadata is watchable.');
    assert.isFalse(krm.hasVerb('get'), 'Test resource metadata is not gettable.');
  });

});
