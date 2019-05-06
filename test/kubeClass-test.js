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
const nock = require('nock');
const deepEqual = require('deep-equal');
const KubeClass = require('../src/kubernetes/kubeClass');

describe('kubeClass', function () {

  describe('#getCoreApis()', () => {
    var kc;

    beforeEach(() => {
      kc = new KubeClass({ baseUrl: 'http://localhost' });
    });

    afterEach(() => {
      kc = undefined;
      nock.cleanAll();
    });

    it('#success', async () => {
      nock('http://localhost/')
        .get('/api/v1')
        .replyWithFile(200, __dirname + '/replies/coreApis.json', { 'Content-Type': 'application/json' });
      let ca = await kc.getCoreApis();
      assert.isTrue(ca[0].hasVerb('watch'), 'Resource has verb \'watch\'');
      assert.isFalse(ca[0].hasVerb('get'), 'Resource does not have verb \'get\'');
      assert.strictEqual(ca[0].uri, '/api/v1/deployments', 'Resource URI should be /api/v1/deployments');
    });

    it('#error', async () => {
      nock('http://localhost/')
        .get('/api/v1')
        .replyWithError('bad things happened man');
      try {
        await kc.getCoreApis();
        assert.fail('#error test should have thrown an error');
      } catch (e) {
        assert.strictEqual(e.name, 'RequestError', 'Request exception should be a \'RequestError\'');
      }
    });


  });

  describe('#getApis()', () => {
    var kc;

    beforeEach(() => {
      kc = new KubeClass({ baseUrl: 'http://localhost' });
    });

    afterEach(() => {
      kc = undefined;
      nock.cleanAll();
    });

    it('#success', async () => {
      nock('http://localhost/')
        .get('/apis')
        .replyWithFile(200, __dirname + '/replies/apiGroups.json', { 'Content-Type': 'application/json' });
      nock('http://localhost/')
        .get('/apis/group1')
        .replyWithFile(200, __dirname + '/replies/apiGroup1.json', { 'Content-Type': 'application/json' });
      nock('http://localhost/')
        .get('/apis/group2')
        .replyWithFile(200, __dirname + '/replies/apiGroup2.json', { 'Content-Type': 'application/json' });
      let apis = await kc.getApis();
      assert.equal(apis.length, 3, 'Should get 3 resource apis');

    });

    it('#success no preferred group', async () => {
      nock('http://localhost/')
        .get('/apis')
        .reply(200, {
          'groups': [{}]
        });
      let apis = await kc.getApis();
      assert.equal(apis.length, 0, 'Should get 0 resource apis');
    });

    it('#success no ApiList', async () => {
      nock('http://localhost/')
        .get('/apis')
        .reply(200, {
          'groups': [{
            'preferredVersion': {
              'groupVersion': 'group1'
            }
          }]
        });
      nock('http://localhost/')
        .get('/apis/group1')
        .reply(200, [{ kind: 'NotAPIResourceList' }]);
      let apis = await kc.getApis();
      assert.equal(apis.length, 0, 'Should get 0 resource apis');
    });

    it('#404', async () => {
      nock('http://localhost/')
        .get('/apis')
        .replyWithFile(200, __dirname + '/replies/apiGroups.json', { 'Content-Type': 'application/json' });
      nock('http://localhost/')
        .get('/apis/group1')
        .reply(404, { msg: 'not found' });
      nock('http://localhost/')
        .get('/apis/group2')
        .reply(404, { msg: 'not found' });
      try {
        await kc.getApis();
      } catch (e) {
        assert.deepEqual(e, { statusCode: 404, body: { msg: 'not found' } });
      }



    });

    it('#error', async () => {
      nock('http://localhost/')
        .get('/apis')
        .replyWithError('bad things happened man');
      try {
        await kc.getApis();
        assert.fail('#error test should have thrown an error');
      } catch (e) {
        assert.strictEqual(e.name, 'RequestError', 'Request exception should be a \'RequestError\'');
      }
    });

  });

  describe('#getKubeResourcesMeta(verb)', () => {
    var kc;

    beforeEach(() => {
      kc = new KubeClass({ baseUrl: 'http://localhost' });
    });

    afterEach(() => {
      kc = undefined;
      nock.cleanAll();
    });

    it('#success', async () => {
      nock('http://localhost/')
        .get('/api/v1')
        .replyWithFile(200, __dirname + '/replies/coreApis.json', { 'Content-Type': 'application/json' });
      nock('http://localhost/')
        .get('/apis')
        .replyWithFile(200, __dirname + '/replies/apiGroups.json', { 'Content-Type': 'application/json' });
      nock('http://localhost/')
        .get('/apis/group1')
        .replyWithFile(200, __dirname + '/replies/apiGroup1.json', { 'Content-Type': 'application/json' });
      nock('http://localhost/')
        .get('/apis/group2')
        .replyWithFile(200, __dirname + '/replies/apiGroup2.json', { 'Content-Type': 'application/json' });
      let mr = await kc.getKubeResourcesMeta('watch');
      assert.equal(mr.length, 3, 'Should get 3 MetaResources that support watch');
    });

    it('#success w/out verb', async () => {
      nock('http://localhost/')
        .get('/api/v1')
        .replyWithFile(200, __dirname + '/replies/coreApis.json', { 'Content-Type': 'application/json' });
      nock('http://localhost/')
        .get('/apis')
        .replyWithFile(200, __dirname + '/replies/apiGroups.json', { 'Content-Type': 'application/json' });
      nock('http://localhost/')
        .get('/apis/group1')
        .replyWithFile(200, __dirname + '/replies/apiGroup1.json', { 'Content-Type': 'application/json' });
      nock('http://localhost/')
        .get('/apis/group2')
        .replyWithFile(200, __dirname + '/replies/apiGroup2.json', { 'Content-Type': 'application/json' });
      let mr = await kc.getKubeResourcesMeta();
      assert.equal(mr.length, 4, 'Should get 4 MetaResources');

    });

    it('#error', async () => {
      nock('http://localhost/')
        .get('/api/v1')
        .replyWithError('bad things happened man');
      nock('http://localhost/')
        .get('/apis')
        .replyWithError('other bad things happened man');
      try {
        await kc.getKubeResourcesMeta();
        assert.fail('#error test should have thrown an error');
      } catch (e) {
        assert.strictEqual(e.name, 'RequestError', 'Request exception should be a \'RequestError\'');
      }
    });

  });

  describe('#getResource()', () => {
    const KubeResourceMeta = require('../src/kubernetes/KubeResourceMeta');
    var kc;

    beforeEach(() => {
      kc = new KubeClass({ baseUrl: 'http://localhost' });
    });

    afterEach(() => {
      kc = undefined;
      nock.cleanAll();
    });

    it('#success', async () => {

      let krm = new KubeResourceMeta('/apis/v1', {
        name: 'deployments',
        singularName: 'deployment',
        namespaced: true,
        kind: 'Deployment',
        'verbs': ['watch']
      });
      let exampleResource = { example: 'resource' };
      let queryObject = { labelSelector: 'app=myapp' };
      let expectedResult = {
        statusCode: 200,
        'resource-metadata': krm,
        object: exampleResource
      };
      nock('http://localhost/')
        .get(krm.uri)
        .query((actualQueryObject) => {
          return deepEqual(actualQueryObject, queryObject);
        })
        .reply(200, exampleResource);
      let r = await kc.getResource(krm, queryObject);
      assert.deepEqual(r, expectedResult);
    });

    it('#404', async () => {

      let krm = new KubeResourceMeta('/apis/v1', {
        name: 'deployments',
        singularName: 'deployment',
        namespaced: true,
        kind: 'Deployment',
        'verbs': ['watch']
      });
      let resourceNotFound = { msg: 'Resource not found' };
      let expectedResult = {
        statusCode: 404,
        'resource-metadata': krm,
        error: resourceNotFound
      };
      nock('http://localhost/')
        .get(krm.uri)
        .reply(404, resourceNotFound);
      let r = await kc.getResource(krm);
      // console.log(r);
      assert.deepEqual(r, expectedResult);
    });

    it('#undefinedMetadata', async () => {
      let r = await kc.getResource(undefined);
      assert.isUndefined(r, 'api should return undefined when metadata input is undefined');
    });

    it('#error', async () => {
      let krm = new KubeResourceMeta('/apis/v1', {
        name: 'deployments',
        singularName: 'deployment',
        namespaced: true,
        kind: 'Deployment',
        'verbs': ['watch']
      });
      nock('http://localhost/')
        .get(krm.uri)
        .replyWithError('bad things happened man');
      try {
        await kc.getKubeResourcesMeta();
        assert.fail('#error test should have thrown an error');
      } catch (e) {
        assert.strictEqual(e.name, 'RequestError', 'Request exception should be a \'RequestError\'');
      }
    });
  });

  describe('#getResources()', () => {
    const KubeResourceMeta = require('../src/kubernetes/KubeResourceMeta');
    var kc;

    beforeEach(() => {
      kc = new KubeClass({ baseUrl: 'http://localhost' });
    });

    afterEach(() => {
      kc = undefined;
      nock.cleanAll();
    });

    it('#success', async () => {
      let krm = new KubeResourceMeta('/apis/v1', {
        name: 'deployments',
        singularName: 'deployment',
        namespaced: true,
        kind: 'Deployment',
        'verbs': ['watch']
      });
      let exampleResource = { example: 'resource' };
      let queryObject = { labelSelector: 'app=myapp' };
      let expectedResult = [{
        statusCode: 200,
        'resource-metadata': krm,
        object: exampleResource
      }];
      nock('http://localhost/')
        .get(krm.uri)
        .query((actualQueryObject) => {
          return deepEqual(actualQueryObject, queryObject);
        })
        .reply(200, exampleResource);
      let r = await kc.getResources([krm], queryObject);
      assert.deepEqual(r, expectedResult);
    });
  });

  describe('#getResourcesPaged()', () => {
    const KubeResourceMeta = require('../src/kubernetes/KubeResourceMeta');
    var kc;

    beforeEach(() => {
      kc = new KubeClass({ baseUrl: 'http://localhost' });
    });

    afterEach(() => {
      kc = undefined;
      nock.cleanAll();
    });

    it('#success - no limit, no next', async () => {

      let krm = new KubeResourceMeta('/apis/v1', {
        name: 'deployments',
        singularName: 'deployment',
        namespaced: true,
        kind: 'Deployment',
        'verbs': ['watch']
      });
      let exampleResource = { example: 'resource' };
      let queryObject = { labelSelector: 'app=myapp' };
      let expectedResult = [{
        statusCode: 200,
        'resource-metadata': krm,
        object: exampleResource
      }];
      nock('http://localhost/')
        .get(krm.uri)
        .query((actualQueryObject) => {
          return deepEqual(actualQueryObject, queryObject);
        })
        .reply(200, exampleResource);
      let r = await kc.getResourcesPaged([krm], queryObject);
      assert.deepEqual(r.resources, expectedResult);
    });

    it('#success - with limit, next', async () => {

      let krm = new KubeResourceMeta('/apis/v1', {
        name: 'deployments',
        singularName: 'deployment',
        namespaced: true,
        kind: 'Deployment',
        'verbs': ['watch']
      });
      let exampleResource = {
        example: 'resource', metadata: {
          selfLink: '/api/v1/endpoints',
          resourceVersion: '12780413'
        },
      };
      let queryObject = { labelSelector: 'app=myapp', limit: 1 };
      let expectedResult = [{
        statusCode: 200,
        'resource-metadata': krm,
        object: exampleResource
      }];
      nock('http://localhost/')
        .get(krm.uri)
        .query((actualQueryObject) => {
          return deepEqual(actualQueryObject, queryObject);
        })
        .reply(200, exampleResource);
      let next = { continue: {}, idx: 0 };
      let r = await kc.getResourcesPaged([krm], queryObject, next);
      assert.deepEqual(r.resources, expectedResult);
    });
  });
});
