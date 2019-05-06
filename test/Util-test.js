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
//process.env.LOG_LEVEL = 'debug';
var rewire = require('rewire');
const Util = rewire('../src/controllers/Util');
const DataCollector = rewire('../src/controllers/DataCollector');
const nock = require('nock');
const TEST_RAZEEDASH_URL = 'https://localhost:3000/api/v2';
const TEST_RAZEEDASH_URL_ALT = 'https://localhost:3000/api/v2';
const TEST_POD = {
  metadata:
  {
    name: 'kubernetes-dashboard',
    namespace: 'kube-system',
    selfLink:
      '/api/v1/namespaces/kube-system/services/kubernetes-dashboard',
    uid: 'b3117196-fca8-11e8-a0e0-36848ff40b0b',
    resourceVersion: '10739692',
    creationTimestamp: '2018-12-10T18:23:32Z',
    labels:
    {
      'addonmanager.kubernetes.io/mode': 'Reconcile',
      'k8s-app': 'kubernetes-dashboard',
      'kubernetes.io/cluster-service': 'true',
      'razee/watch-resource': 'lite'
    },
    annotations:
    {
      'kubectl.kubernetes.io/last-applied-configuration':
        '{"apiVersion":"v1","kind":"Service","metadata":{"annotations":{},"labels":{"addonmanager.kubernetes.io/mode":"Reconcile","k8s-app":"kubernetes-dashboard","kubernetes.io/cluster-service":"true"},"name":"kubernetes-dashboard","namespace":"kube-system"},"spec":{"ports":[{"port":443,"targetPort":8443}],"selector":{"k8s-app":"kubernetes-dashboard"}}}\n'
    }
  },
  status: { loadBalancer: {} }
};
const TEST_POD_STRINGFY_RESULT = '{"metadata":{"name":"kubernetes-dashboard","namespace":"kube-system","selfLink":"/api/v1/namespaces/kube-system/services/kubernetes-dashboard","uid":"b3117196-fca8-11e8-a0e0-36848ff40b0b","resourceVersion":"10739692","creationTimestamp":"2018-12-10T18:23:32Z","labels":{"addonmanager.kubernetes.io/mode":"Reconcile","k8s-app":"kubernetes-dashboard","kubernetes.io/cluster-service":"true","razee/watch-resource":"lite"},"annotations":{}},"status":{"loadBalancer":{}}}';

describe('Util', () => {

  before(() => { });
  beforeEach(() => {
    nock('https://localhost:3000')
      .post('/api/v2/clusters/good')
      .reply(205, '{"meta":"meta"}')
      .post('/api/v2/clusters/fail')
      .reply(500, '{"meta":"meta"}')
      .post('/api/v2/clusters/fail/messages')
      .reply(200, '{"level":"ERROR","message":"some fail","data":{}}')
      .post('/api/v2/clusters/warn/messages')
      .reply(200, '{"level":"WARN","message":"some warn","data":{}}')
      .post('/api/v2/clusters/msg/messages')
      .reply(200, '{"level":"INFO","message":"some info","data":{}}')
      .post('/api/v2/clusters/info/messages')
      .reply(200, '{"level":"INFO","message":"some info","data":{}}');
  });
  afterEach(() => { });
  after(() => { });

  // ===========================================================================
  describe('constuctor()', () => {
    it('razeedashUrl attribute', async () => {
      let util = new Util(TEST_RAZEEDASH_URL, 'info');
      assert.equal(util.razeedashUrl, TEST_RAZEEDASH_URL, 'should return assigned URL');
    });
    it('dsa attribute', () => {
      let util = new Util(TEST_RAZEEDASH_URL, 'info');
      assert.isAbove(util.dsa.maxItems, 0);
    });
    it('messenger attribute', async () => {
      let util = new Util(TEST_RAZEEDASH_URL, 'msg');
      let result = await util.messenger.info('some info');
      assert.equal(result.statusCode, 200);
    });
  });

  // ===========================================================================
  describe('#heartbeat()', () => {
    // ---------- Success ----------
    it('success', async () => {
      var getClusterMeta = {
        getClusterMeta: async () => {
          return { meta: 'meta' };
        }
      };
      DataCollector.__set__('getClusterMeta', getClusterMeta);
      Util.__set__('dc', getClusterMeta);
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      let result = await util.heartbeat();
      assert.isTrue(result);
    });
    it('fail', async () => {
      var getClusterMeta = {
        getClusterMeta: async () => {
          return { meta: 'meta' };
        }
      };
      DataCollector.__set__('getClusterMeta', getClusterMeta);
      Util.__set__('dc', getClusterMeta);
      let util = new Util(TEST_RAZEEDASH_URL, 'fail');
      let result = await util.heartbeat();
      assert.isFalse(result);
    });
    it('throw', async () => {
      var getClusterMeta = {
        getClusterMeta: async () => {
          throw new Error('some error');
        }
      };
      DataCollector.__set__('getClusterMeta', getClusterMeta);
      Util.__set__('dc', getClusterMeta);
      let util = new Util(TEST_RAZEEDASH_URL, 'fail');
      let result = await util.heartbeat();
      assert.isFalse(result);
    });
  });

  // ===========================================================================
  describe('loggers', () => {
    describe('#error', () => {
      it('success', async () => {
        nock('https://localhost:3000')
          .post('/api/v2/clusters/testerror/messages')
          .reply(200, '{"level":"ERROR","message":"some fail","data":{}}');
        let util = new Util(TEST_RAZEEDASH_URL, 'testerror');
        let result = await util.error('some error');
        assert.equal(result.statusCode, 200);
      });
      it('fail', async () => {
        nock('https://localhost:3000')
          .post('/api/v2/clusters/testerror/messages')
          .replyWithError('something awful happened');
        let util = new Util(TEST_RAZEEDASH_URL, 'testerror');
        let result = await util.error('some error');
        assert.equal(result.statusCode, 500);
      });
    });

    describe('#warn', () => {
      it('success', async () => {
        nock('https://localhost:3000')
          .post('/api/v2/clusters/testwarn/messages')
          .reply(200, '{"level":"WARN","message":"some warn","data":{}}');
        let util = new Util(TEST_RAZEEDASH_URL, 'testwarn');
        let result = await util.warn('some warn');
        assert.equal(result.statusCode, 200);
      });
      it('fail', async () => {
        nock('https://localhost:3000')
          .post('/api/v2/clusters/testwarn/messages')
          .replyWithError('something awful happened');
        let util = new Util(TEST_RAZEEDASH_URL, 'testwarn');
        let result = await util.warn('some warn');
        assert.equal(result.statusCode, 500);
      });
    });

    describe('#info', () => {
      it('success', async () => {
        nock('https://localhost:3000')
          .post('/api/v2/clusters/testinfo/messages')
          .reply(200, '{"level":"WARN","message":"some info","data":{}}');
        let util = new Util(TEST_RAZEEDASH_URL, 'testinfo');
        let result = await util.info('some info');
        assert.equal(result.statusCode, 200);
      });
      it('fail', async () => {
        nock('https://localhost:3000')
          .post('/api/v2/clusters/testinfo/messages')
          .replyWithError('something awful happened');
        let util = new Util(TEST_RAZEEDASH_URL, 'testinfo');
        let result = await util.info('some info');
        assert.equal(result.statusCode, 500);
      });
    });
  });
  describe('fetch', () => {
    // ---------- Success ----------
    it('fetch - set default', async () => {
      var getClusterUid = {
        getClusterUid: async () => {
          return 'good';
        }
      };
      DataCollector.__set__('getClusterUid', getClusterUid);
      Util.__set__('dc', getClusterUid);
      let util = await Util.fetch(TEST_RAZEEDASH_URL);
      assert.equal(util.razeedashUrl, TEST_RAZEEDASH_URL);
      let cache = Util.__get__('util');
      let cacheObj = cache[TEST_RAZEEDASH_URL];
      assert.isNotNull(cacheObj);
      assert.equal(cacheObj.razeedashUrl, TEST_RAZEEDASH_URL);
      let cached = await Util.fetch(TEST_RAZEEDASH_URL);
      assert.equal(cached.razeedashUrl, TEST_RAZEEDASH_URL);
    });    // ---------- Success ----------
    it('fetch - override default', async () => {
      var getClusterUid = {
        getClusterUid: async () => {
          return 'good';
        }
      };
      DataCollector.__set__('getClusterUid', getClusterUid);
      Util.__set__('dc', getClusterUid);
      let util = await Util.fetch(TEST_RAZEEDASH_URL, true); // set default
      util = await Util.fetch(TEST_RAZEEDASH_URL_ALT, true); // override default
      assert.equal(util.razeedashUrl, TEST_RAZEEDASH_URL_ALT);
      let cache = Util.__get__('util');
      let cacheObj = cache[undefined];
      assert.isNotNull(cacheObj);
      assert.equal(cacheObj.razeedashUrl, TEST_RAZEEDASH_URL_ALT);
    });
  });
  // ===========================================================================
  describe('addHash', () => {
    // ---------- Success ----------
    it('handles an object with array of "items"', () => {
      let result = Util.addHash({ items: [{ type: 'gismo' }] });
      assert.equal(JSON.stringify(result), '{"items":[{"type":"gismo","razeehash":"e181ea047cdac260b67e1f538c77622b553ad744"}]}');
    });
    it('handles an array', () => {
      let result = Util.addHash([{ type: 'gismo' }]);
      assert.equal(JSON.stringify(result), '[{"type":"gismo","razeehash":"e181ea047cdac260b67e1f538c77622b553ad744"}]');
    });
    it('handles an object', () => {
      let result = Util.addHash({ type: 'gismo' });
      assert.equal(JSON.stringify(result), '{"type":"gismo","razeehash":"e181ea047cdac260b67e1f538c77622b553ad744"}');
    });
    it('object does not have type attr then it should not get razeehash attr', () => {
      let result = Util.addHash({ stuff: 'gismo' });
      assert.equal(JSON.stringify(result), '{"stuff":"gismo"}');
    });
  });
  // ===========================================================================
  describe('prepObject2Send', () => {
    // ---------- Success ----------
    it('handles an object with array of "items"', () => {
      let result = Util.prepObject2Send({ items: [TEST_POD] });
      assert.equal(JSON.stringify(result), '{"items":[' + TEST_POD_STRINGFY_RESULT + ']}');
    });
    it('handles an array', () => {
      let result = Util.prepObject2Send([TEST_POD]);
      assert.equal(JSON.stringify(result), '[' + TEST_POD_STRINGFY_RESULT + ']');
    });
    it('handles an object', () => {
      let result = Util.prepObject2Send({ object: TEST_POD });
      assert.equal(JSON.stringify(result), '{"object":' + TEST_POD_STRINGFY_RESULT + '}');
    });
    it('redact Secret', () => {
      let result = Util.prepObject2Send({ kind: 'Secret', data: { a: 'a', b: 'b' } });
      assert.equal(result.data.a, 'REDACTED');
      assert.equal(result.data.b, 'REDACTED');
    });
    it('redact spec.template.spec.containers', () => {
      let result = Util.prepObject2Send({ spec: { template: { spec: { containers: { env: [{ key: 'a', value: 'secret stuff' }] } } } } });
      assert.equal(result.spec.template.spec.containers.env[0].value, 'REDACTED');
    });
    it('redact spec.containers', () => {
      let result = Util.prepObject2Send({ spec: { containers: { env: [{ key: 'a', value: 'secret stuff' }] } } });
      assert.equal(result.spec.containers.env[0].value, 'REDACTED');
    });
    it('redact spec.jobTemplate.spec.template.spec.containers', () => {
      let result = Util.prepObject2Send({ spec: { jobTemplate: { spec: { template: { spec: { containers: { env: [{ key: 'a', value: 'secret stuff' }] } } } } } } });
      assert.equal(result.spec.jobTemplate.spec.template.spec.containers.env[0].value, 'REDACTED');
    });
  });
  describe('clearContainerEnvs', () => {
    it('object', () => {
      let data = { env: [{ key: 'a', value: 'b' }] };
      Util.clearContainerEnvs(data);
      assert.equal(data.env[0].value, 'REDACTED');
    });
    it('array', () => {
      let data = [{ env: [{ key: 'a', value: 'b' }] }];
      Util.clearContainerEnvs(data);
      assert.equal(data[0].env[0].value, 'REDACTED');
    });
  });
  describe('hasLabel', () => {
    it('metadata', () => {
      let data = { metadata: { labels: { 'razee/watch-resource': 'lite' } } };
      assert.isTrue(Util.hasLabel(data, 'razee/watch-resource'));
    });
    it('object', () => {
      let data = {
        object: { metadata: { labels: { 'razee/watch-resource': 'lite' } } }
      };
      assert.isTrue(Util.hasLabel(data, 'razee/watch-resource'));
    });
  });
  describe('lightSynonyms', () => {
    it('string', () => {
      assert.equal(Util.liteSynonyms(), 'lite,light,brief');
    });
  });
  describe('detailSynonyms', () => {
    it('string', () => {
      assert.equal(Util.detailSynonyms(), 'heavy,detail,detailed');
    });
  });
});
