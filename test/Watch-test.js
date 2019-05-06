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
var rewire = require('rewire');
const DataCollector = rewire('../src/controllers/DataCollector');
const Watch = rewire('../src/controllers/Watch');
const Util = rewire('../src/controllers/Util');
const nock = require('nock');
const TEST_RAZEEDASH_URL = 'https://localhost:3000/api/v2';
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

describe('Watch', () => {
  beforeEach(() => {
    nock('https://localhost:3000')
      .post('/api/v2/clusters/good/resources', () => {
        return true;
      })
      .reply(200, { success: '¯\\_(ツ)_/¯' })
      .post('/api/v2/clusters/good/messages')
      .reply(200, '{"level":"ERROR","message":"some error","data":{}}');
  });

  describe('#removeAllWatches', () => {
    it('success', () => {
      let mockWatchManager = {
        removeAllWatches: () => { return true; }
      };
      let revertWatch = Watch.__set__(
        {
          'WatchManager': mockWatchManager,
        }
      );
      let result = Watch.removeAllWatches();
      revertWatch();
      assert.isTrue(result);
    });
  });

  describe('#watch', () => {
    it('success', async () => {
      DataCollector.__set__({
        getClusterUid: async () => { return 'good'; },
        getClusterMeta: async () => { return {}; }
      });
      let mockWatchManager = {
        ensureWatch: (options, objectHandler) => { // eslint-disable-line no-nounuse-vars
          return objectHandler(TEST_POD);
        }
      };
      let mockKubeClass = {
        getKubeResourcesMeta: async (verb) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{
            '_path': '/api/v1',
            '_resourceMeta': {
              'name': 'endpoints',
              'singularName': '',
              'namespaced': true,
              'kind': 'Endpoints',
              'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'],
              'shortNames': ['ep']
            }
          }]);
        },
        getResource: async (resourceMeta, queryParms) => { // eslint-disable-line no-unused-vars
          return Promise.resolve({
            'resource-metadata': {
              '_path': '/api/v1',
              '_resourceMeta': {
                'name': 'endpoints',
                'singularName': '',
                'namespaced': true,
                'kind': 'Endpoints',
                'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'],
                'shortNames': ['ep']
              }
            },
            'statusCode': 200,
            'object': {
              'kind': 'EndpointsList',
              'apiVersion': 'v1',
              'metadata': {
                'selfLink': '/api/v1/endpoints',
                'resourceVersion': '12780413'
              },
              'items': [{
                'metadata': {
                  'name': 'kubernetes-dashboard',
                  'namespace': 'kube-system',
                  'selfLink': '/api/v1/namespaces/kube-system/endpoints/kubernetes-dashboard',
                  'uid': 'b3156476-fca8-11e8-9f10-3a7d3a0f8cf2',
                  'resourceVersion': '10739693',
                  'creationTimestamp': '2018-12-10T18:23:32Z',
                  'labels': {
                    'addonmanager.kubernetes.io/mode': 'Reconcile',
                    'k8s-app': 'kubernetes-dashboard',
                    'kubernetes.io/cluster-service': 'true',
                    'razee/watch-resource': 'lite'
                  }
                },
                'subsets': [{
                  'addresses': [{
                    'ip': '172.30.167.199',
                    'nodeName': '10.190.53.3',
                    'targetRef': {
                      'kind': 'Pod',
                      'namespace': 'kube-system',
                      'name': 'kubernetes-dashboard-866c4b5df-zdr6m',
                      'uid': '16e8dfc8-1df5-11e9-9b2c-968d43411ffe',
                      'resourceVersion': '10609328'
                    }
                  }],
                  'ports': [{
                    'port': 8443,
                    'protocol': 'TCP'
                  }]
                }]
              }]
            }
          });
        }
      };
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      var revertWatch = Watch.__set__(
        {
          'kc': mockKubeClass,
          'util': util,
          'WatchManager': mockWatchManager,
        }
      );
      Watch.__set__('util', util);
      let result = await Watch.watch();
      revertWatch();
      assert.isTrue(result);
    });

    it('error', async () => {
      DataCollector.__set__({
        getClusterUid: async () => { return 'good'; },
        getClusterMeta: async () => { return {}; }
      });
      let mockWatchManager = {
        ensureWatch: (options, objectHandler) => { // eslint-disable-line no-nounuse-vars
          return objectHandler(TEST_POD);
        }
      };
      let mockKubeClass = {
        getKubeResourcesMeta: async (verb) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{
            '_path': '/api/v1',
            '_resourceMeta': {
              'name': 'endpoints',
              'singularName': '',
              'namespaced': true,
              'kind': 'Endpoints',
              'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'],
              'shortNames': ['ep']
            }
          }]);
        },
        getResource: async (resourceMeta, queryParms) => { // eslint-disable-line no-unused-vars
          throw new Error('my bad');
        }
      };
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      var revertWatch = Watch.__set__(
        {
          'kc': mockKubeClass,
          'util': util,
          'WatchManager': mockWatchManager,
        }
      );
      Watch.__set__('util', util);
      let result = await Watch.watch();
      revertWatch();
      assert.isFalse(result);
    });

    it('success - remove watch - watchable.metadata.continue undefined', async () => {
      DataCollector.__set__({
        getClusterUid: async () => { return 'good'; },
        getClusterMeta: async () => { return {}; }
      });
      let mockWatchManager = {
        ensureWatch: (options, objectHandler, startWatch = true) => { // eslint-disable-line no-unused-vars
          return TEST_POD;
        },
        removeWatch: (selfLink) => { // eslint-disable-line no-unused-vars
          return TEST_POD;
        }
      };
      let mockKubeClass = {
        getKubeResourcesMeta: async (verb) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{
            '_path': '/api/v1',
            '_resourceMeta': {
              'name': 'endpoints',
              'singularName': '',
              'namespaced': true,
              'kind': 'Endpoints',
              'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'],
              'shortNames': ['ep']
            }
          }]);
        },
        getResource: async (resourceMeta, queryParms) => { // eslint-disable-line no-unused-vars
          return Promise.resolve({
            'resource-metadata': {
              '_path': '/api/v1',
              '_resourceMeta': {
                'name': 'endpoints',
                'singularName': '',
                'namespaced': true,
                'kind': 'Endpoints',
                'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'],
                'shortNames': ['ep']
              }
            },
            'statusCode': 200,
            'object': {
              'kind': 'EndpointsList',
              'apiVersion': 'v1',
              'metadata': {
                'selfLink': '/api/v1/endpoints',
                'resourceVersion': '12780413'
              },
              'items': []
            }
          });
        }
      };
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      var revertWatch = Watch.__set__(
        {
          'kc': mockKubeClass,
          'util': util,
          'WatchManager': mockWatchManager,
        }
      );
      Watch.__set__('util', util);
      let result = await Watch.watch();
      revertWatch();
      assert.isTrue(result);
    });

    it('success - remove watch - watchable.metadata.continue blank', async () => {
      DataCollector.__set__({
        getClusterUid: async () => { return 'good'; },
        getClusterMeta: async () => { return {}; }
      });
      let mockWatchManager = {
        ensureWatch: (options, objectHandler, startWatch = true) => { // eslint-disable-line no-unused-vars
          return TEST_POD;
        },
        removeWatch: (selfLink) => { // eslint-disable-line no-unused-vars
          return TEST_POD;
        }
      };
      let mockKubeClass = {
        getKubeResourcesMeta: async (verb) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{
            '_path': '/api/v1',
            '_resourceMeta': {
              'name': 'endpoints',
              'singularName': '',
              'namespaced': true,
              'kind': 'Endpoints',
              'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'],
              'shortNames': ['ep']
            }
          }]);
        },
        getResource: async (resourceMeta, queryParms) => { // eslint-disable-line no-unused-vars
          return Promise.resolve({
            'resource-metadata': {
              '_path': '/api/v1',
              '_resourceMeta': {
                'name': 'endpoints',
                'singularName': '',
                'namespaced': true,
                'kind': 'Endpoints',
                'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'],
                'shortNames': ['ep']
              }
            },
            'statusCode': 200,
            'object': {
              'kind': 'EndpointsList',
              'apiVersion': 'v1',
              'metadata': {
                'continue': '',
                'selfLink': '/api/v1/endpoints',
                'resourceVersion': '12780413'
              },
              'items': []
            }
          });
        }
      };
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      var revertWatch = Watch.__set__(
        {
          'kc': mockKubeClass,
          'util': util,
          'WatchManager': mockWatchManager,
        }
      );
      Watch.__set__('util', util);
      let result = await Watch.watch();
      revertWatch();
      assert.isTrue(result);
    });
  });
});
