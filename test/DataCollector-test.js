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

// process.env.LOG_LEVEL = 'fatal';
const DataCollector = require('../src/controllers/DataCollector');


describe('DataCollector', () => {

  before(() => {});
  beforeEach(() => {});
  afterEach(() => {});
  after(() => {});

  // ===========================================================================
  describe('#getClusterUid()', () => {
    // ---------- Success ----------
    it('should return clusterID of kube-system ns', async () => {
      let kc = {
        'getResource': async (resourceMeta) => {
          return Promise.resolve({ 'resource-metadata': resourceMeta, statusCode: 200, object: { kind: 'Namespace', apiVersion: 'v1', metadata: { name: 'kube-system', selfLink: '/api/v1/namespaces/kube-system', uid: 'e8fedf64-feee-11e8-8c2c-ba7d124748cf' } } });
        }
      };
      let dc = new DataCollector(kc);
      let result = await dc.getClusterUid();
      assert.equal(result, 'e8fedf64-feee-11e8-8c2c-ba7d124748cf', 'should retrieve clusterID from kube-system namespace');
    });

    it('should cache and return clusterID of kube-system ns', async () => {
      let kc = {
        'getResource': async (resourceMeta) => {
          return Promise.resolve({ 'resource-metadata': resourceMeta, statusCode: 200, object: { kind: 'Namespace', apiVersion: 'v1', metadata: { name: 'kube-system', selfLink: '/api/v1/namespaces/kube-system', uid: 'e8fedf64-feee-11e8-8c2c-ba7d124748cf' } } });
        }
      };
      let dc = new DataCollector(kc);
      await dc.getClusterUid();
      let q2 = await dc.getClusterUid();
      assert.equal(q2, 'e8fedf64-feee-11e8-8c2c-ba7d124748cf', 'should retrieve clusterID from cache');
    });

    // ---------- Failure ----------
    it('should return any errors to caller', async () => {
      let kc = {
        'getResource': async () => {
          throw Error('you are doomed');
        }
      };
      let dc = new DataCollector(kc);
      try {
        await dc.getClusterUid();
        throw Error('should not continue after failed to get clusterUid');
      } catch (e) {
        assert.equal(e.message, 'you are doomed', 'should get error from call to getResource()');
      }
    });
  });

  // ===========================================================================
  describe('#getClusterMeta()', () => {
    // ---------- Success ----------
    it('should retrieve cluster metadata from configmaps with "razee/cluster-metadata=true"', async () => {
      let kc = {
        'getResource': async (resourceMeta) => {
          let uri = resourceMeta.uri();
          if (uri == '/api/v1/configmaps') {
            return Promise.resolve({
              'resource-metadata': { uri: uri },
              statusCode: 200,
              object: { kind: 'ConfigMapList', apiVersion: 'v1', metadata: { selfLink: '/api/v1/configmaps' }, items: [{ metadata: {}, data: { name: 'all of the data' } }] }
            });
          } else if (uri == '/version') {
            return Promise.resolve({
              'resource-metadata': { uri: uri },
              statusCode: 200,
              object: { major: '1', minor: '11', gitVersion: 'v1.11.8+IKS', gitCommit: '96a2c37bcb058bf3dacfde9e56b7857b3b1fb137', gitTreeState: 'clean', buildDate: '2019-03-21T06:08:38Z', goVersion: 'go1.10.8', compiler: 'gc', platform: 'linux/amd64' }
            });
          }
        }
      };
      let dc = new DataCollector(kc);
      let result = await dc.getClusterMeta();
      let expectedResult = { name: 'all of the data', kube_version: { major: '1', minor: '11', gitVersion: 'v1.11.8+IKS', gitCommit: '96a2c37bcb058bf3dacfde9e56b7857b3b1fb137', gitTreeState: 'clean', buildDate: '2019-03-21T06:08:38Z', goVersion: 'go1.10.8', compiler: 'gc', platform: 'linux/amd64' } };
      assert.deepEqual(result, expectedResult, 'should retrieve cluster metadata from configmaps with "razee/cluster-metadata=true"');
    });

    it('should overwite duplicate fields, last in wins', async () => {
      let kc = {
        'getResource': async (resourceMeta) => {
          let uri = resourceMeta.uri();
          if (uri == '/api/v1/configmaps') {
            return Promise.resolve({
              'resource-metadata': { uri: '/api/v1/configmaps' },
              statusCode: 200,
              object: { kind: 'ConfigMapList', apiVersion: 'v1', metadata: { selfLink: '/api/v1/configmaps' }, items: [{ metadata: {}, data: { name: 'all of the data' } }, { metadata: {}, data: { name: 'Razee-Dev', region: 'us-south' } }] }
            });
          } else if (uri == '/version') {
            return Promise.resolve({
              'resource-metadata': { uri: uri },
              statusCode: 200,
              object: { major: '1', minor: '11', gitVersion: 'v1.11.8+IKS', gitCommit: '96a2c37bcb058bf3dacfde9e56b7857b3b1fb137', gitTreeState: 'clean', buildDate: '2019-03-21T06:08:38Z', goVersion: 'go1.10.8', compiler: 'gc', platform: 'linux/amd64' }
            });
          }
        }
      };
      let dc = new DataCollector(kc);
      let result = await dc.getClusterMeta();
      let expectedResult = { name: 'Razee-Dev', region: 'us-south', kube_version: { major: '1', minor: '11', gitVersion: 'v1.11.8+IKS', gitCommit: '96a2c37bcb058bf3dacfde9e56b7857b3b1fb137', gitTreeState: 'clean', buildDate: '2019-03-21T06:08:38Z', goVersion: 'go1.10.8', compiler: 'gc', platform: 'linux/amd64' } };
      assert.deepEqual(result, expectedResult, 'should overwrite duplicate fields');
    });

    // ---------- Failure ----------
    it('should return any errors to caller', async () => {
      let kc = {
        'getResource': async () => {
          throw Error('you are doomed');
        }
      };
      let dc = new DataCollector(kc);
      try {
        await dc.getClusterMeta();
        throw Error('should not continue after failed to get getClusterMeta');
      } catch (e) {
        assert.equal(e.message, 'you are doomed', 'should get error from call to getResource()');
      }
    });
  });

  // ===========================================================================
});
