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
var deepEqual = require('deep-equal');
const nock = require('nock');
const rewire = require('rewire');
const sinon = require('sinon');
const Util = rewire('../src/controllers/Util');
const UtilSinon = require('../src/controllers/Util');

const sandbox = sinon.createSandbox();

const log = require('../src/bunyan-api').createLogger('Poll-test');
const TEST_RAZEEDASH_URL = 'https://localhost:3000/api/v2';

let metaResources = [{ '_path': '/api/v1', '_resourceMeta': { 'name': 'componentstatuses', 'singularName': '', 'namespaced': false, 'kind': 'ComponentStatus', 'verbs': ['get', 'list'], 'shortNames': ['cs'] } }, { '_path': '/api/v1', '_resourceMeta': { 'name': 'configmaps', 'singularName': '', 'namespaced': true, 'kind': 'ConfigMap', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['cm'] } }, { '_path': '/api/v1', '_resourceMeta': { 'name': 'endpoints', 'singularName': '', 'namespaced': true, 'kind': 'Endpoints', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['ep'] } }, { '_path': '/api/v1', '_resourceMeta': { 'name': 'namespaces', 'singularName': '', 'namespaced': false, 'kind': 'Namespace', 'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['ns'] } }, { '_path': '/api/v1', '_resourceMeta': { 'name': 'nodes', 'singularName': '', 'namespaced': false, 'kind': 'Node', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['no'] } }, { '_path': '/api/v1', '_resourceMeta': { 'name': 'pods', 'singularName': '', 'namespaced': true, 'kind': 'Pod', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['po'], 'categories': ['all'] } }, { '_path': '/api/v1', '_resourceMeta': { 'name': 'secrets', 'singularName': '', 'namespaced': true, 'kind': 'Secret', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'] } }, { '_path': '/api/v1', '_resourceMeta': { 'name': 'serviceaccounts', 'singularName': '', 'namespaced': true, 'kind': 'ServiceAccount', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['sa'] } }, { '_path': '/api/v1', '_resourceMeta': { 'name': 'services', 'singularName': '', 'namespaced': true, 'kind': 'Service', 'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['svc'], 'categories': ['all'] } }, { '_path': '/apis/apiregistration.k8s.io/v1', '_resourceMeta': { 'name': 'apiservices', 'singularName': '', 'namespaced': false, 'kind': 'APIService', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'] } }, { '_path': '/apis/apps/v1', '_resourceMeta': { 'name': 'daemonsets', 'singularName': '', 'namespaced': true, 'kind': 'DaemonSet', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['ds'], 'categories': ['all'] } }, { '_path': '/apis/apps/v1', '_resourceMeta': { 'name': 'deployments', 'singularName': '', 'namespaced': true, 'kind': 'Deployment', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['deploy'], 'categories': ['all'] } }, { '_path': '/apis/extensions/v1beta1', '_resourceMeta': { 'name': 'ingresses', 'singularName': '', 'namespaced': true, 'kind': 'Ingress', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['ing'] } }, { '_path': '/apis/networking.k8s.io/v1', '_resourceMeta': { 'name': 'networkpolicies', 'singularName': '', 'namespaced': true, 'kind': 'NetworkPolicy', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['netpol'] } }, { '_path': '/apis/policy/v1beta1', '_resourceMeta': { 'name': 'podsecuritypolicies', 'singularName': '', 'namespaced': false, 'kind': 'PodSecurityPolicy', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['psp'] } }, { '_path': '/apis/apps/v1', '_resourceMeta': { 'name': 'replicasets', 'singularName': '', 'namespaced': true, 'kind': 'ReplicaSet', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['rs'], 'categories': ['all'] } }, { '_path': '/apis/apps/v1', '_resourceMeta': { 'name': 'controllerrevisions', 'singularName': '', 'namespaced': true, 'kind': 'ControllerRevision', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'] } }, { '_path': '/apis/rbac.authorization.k8s.io/v1', '_resourceMeta': { 'name': 'clusterrolebindings', 'singularName': '', 'namespaced': false, 'kind': 'ClusterRoleBinding', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'] } }, { '_path': '/apis/rbac.authorization.k8s.io/v1', '_resourceMeta': { 'name': 'clusterroles', 'singularName': '', 'namespaced': false, 'kind': 'ClusterRole', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'] } }, { '_path': '/apis/rbac.authorization.k8s.io/v1', '_resourceMeta': { 'name': 'rolebindings', 'singularName': '', 'namespaced': true, 'kind': 'RoleBinding', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'] } }, { '_path': '/apis/rbac.authorization.k8s.io/v1', '_resourceMeta': { 'name': 'roles', 'singularName': '', 'namespaced': true, 'kind': 'Role', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'] } }, { '_path': '/apis/storage.k8s.io/v1', '_resourceMeta': { 'name': 'storageclasses', 'singularName': '', 'namespaced': false, 'kind': 'StorageClass', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['sc'] } }, { '_path': '/apis/admissionregistration.k8s.io/v1beta1', '_resourceMeta': { 'name': 'mutatingwebhookconfigurations', 'singularName': '', 'namespaced': false, 'kind': 'MutatingWebhookConfiguration', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'] } }, { '_path': '/apis/admissionregistration.k8s.io/v1beta1', '_resourceMeta': { 'name': 'validatingwebhookconfigurations', 'singularName': '', 'namespaced': false, 'kind': 'ValidatingWebhookConfiguration', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'] } }, { '_path': '/apis/apiextensions.k8s.io/v1beta1', '_resourceMeta': { 'name': 'customresourcedefinitions', 'singularName': '', 'namespaced': false, 'kind': 'CustomResourceDefinition', 'verbs': ['create', 'delete', 'deletecollection', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['crd', 'crds'] } }, { '_path': '/apis/securityenforcement.admission.cloud.ibm.com/v1beta1', '_resourceMeta': { 'name': 'clusterimagepolicies', 'singularName': 'clusterimagepolicy', 'namespaced': false, 'kind': 'ClusterImagePolicy', 'verbs': ['delete', 'deletecollection', 'get', 'list', 'patch', 'create', 'update', 'watch'] } }, { '_path': '/apis/securityenforcement.admission.cloud.ibm.com/v1beta1', '_resourceMeta': { 'name': 'imagepolicies', 'singularName': 'imagepolicy', 'namespaced': true, 'kind': 'ImagePolicy', 'verbs': ['delete', 'deletecollection', 'get', 'list', 'patch', 'create', 'update', 'watch'] } }];

const Poll = rewire('../src/controllers/Poll');

var revertUtil;

describe('Poll', () => {
  before(() => {});
  after(() => {});
  beforeEach(() => {
    nock('https://localhost:3000')
      .persist()
      .post('/api/v2/clusters/good')
      .reply(205, { 'meta': 'meta' })
      .post('/api/v2/clusters/good/messages', () => { return true; })
      .reply(200, function (uri, requestBody) {
        return requestBody;
      })
      .post('/api/v2/clusters/good/resources', () => {
        return true;
      })
      .reply(200, { success: '¯\\_(ツ)_/¯' });
    // Util
    var getClusterUid = {
      getClusterUid: async () => {
        log.info('good');
        return Promise.resolve('good');
      }
    };
    var mocklog = async (msg, err) => { return Promise.resolve(true); }; // eslint-disable-line no-unused-vars

    revertUtil = Util.__set__({
      'dc': getClusterUid,
      'warn': mocklog,
      'info': mocklog,
      'error': mocklog
    });

    sandbox.stub(UtilSinon, 'getConfigMap').callsFake(() => { return Promise.resolve({ statusCode: 404, error: { message: 'not found' } }); });
  });
  afterEach(() => {
    revertUtil();
    sandbox.restore();
  });

  describe('#createPolledResource', () => {
    it('success', () => {
      let createPolledResource = Poll.__get__('createPolledResource');
      let resourceFormatter = Poll.__get__('resourceFormatter');
      let given = {
        'kind': 'EndpointsList',
        'apiVersion': 'v1',
        'metadata': {
          'selfLink': '/api/v1/endpoints',
          'resourceVersion': '14403118'
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
            'addresses': [{ 'ip': '172.30.167.199', 'nodeName': '10.190.53.3', 'targetRef': { 'kind': 'Pod', 'namespace': 'kube-system', 'name': 'kubernetes-dashboard-866c4b5df-zdr6m', 'uid': '16e8dfc8-1df5-11e9-9b2c-968d43411ffe', 'resourceVersion': '10609328' } }],
            'ports': [{ 'port': 8443, 'protocol': 'TCP' }]
          }]
        }]
      };
      let expected = [{
        'type': 'POLLED',
        'object': {
          'kind': 'Endpoints',
          'apiVersion': 'v1',
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
          }
        }
      }];
      let actual = createPolledResource(given, resourceFormatter);
      assert.isTrue(deepEqual(actual, expected), JSON.stringify(actual));
    });
    it('empty', () => {
      let createPolledResource = Poll.__get__('createPolledResource');
      let resourceFormatter = Poll.__get__('resourceFormatter');
      let given = { 'kind': 'APIServiceList', 'apiVersion': 'apiregistration.k8s.io/v1', 'metadata': { 'selfLink': '/apis/apiregistration.k8s.io/v1/apiservices', 'resourceVersion': '14403119' }, 'items': [] };
      let expected = [];
      let actual = createPolledResource(given, resourceFormatter);
      assert.isTrue(deepEqual(actual, expected), JSON.stringify(actual));
    });
  });

  describe('#handleSelector', () => {
    it('success', async () => {
      // --- Given ---
      let selector = { 'labelSelector': 'razee/watch-resource in (true,heavy,detail,detailed)', 'limit': 500 };
      let resourceFormatter = Poll.__get__('resourceFormatter');
      // --- Mocks ---
      // Util
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      // DSA
      let fakeSender = {
        send: sinon.fake()
      };
      // KubeClass
      let mockKubeClass = {
        getResourcesPaged: async (resourceMeta, queryParms) => { // eslint-disable-line no-unused-vars
          return Promise.resolve({
            'resources': [{
              'resource-metadata': {
                '_path': '/api/v1',
                '_resourceMeta': { 'name': 'namespaces', 'singularName': '', 'namespaced': false, 'kind': 'Namespace', 'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['ns'] }
              },
              'statusCode': 200,
              'object': { 'kind': 'NamespaceList', 'apiVersion': 'v1', 'metadata': { 'selfLink': '/api/v1/namespaces', 'resourceVersion': '14426928' }, 'items': [] }
            }]
          });
        }
      };
      // Poll
      let createPolledResourceResponse = [{
        'type': 'POLLED',
        'object': {
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
          }
        }
      }];
      var revertPoll = Poll.__set__({
        'util': util,
        'kc': mockKubeClass,
        'createPolledResource': (resourceList, resourceFormatter) => { return createPolledResourceResponse; }, // eslint-disable-line no-unused-vars
      });
      // Test
      let handleSelection = Poll.__get__('handleSelector');
      let result = await handleSelection(metaResources, fakeSender, selector, resourceFormatter);
      revertPoll();

      assert.isTrue(result);

    });
    it('failed', async () => {
      // --- Given ---
      let selector = { 'labelSelector': 'razee/watch-resource in (true,heavy,detail,detailed)', 'limit': 500 };
      let resourceFormatter = Poll.__get__('resourceFormatter');
      // --- Mocks ---
      // Util
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      // DSA
      let fakeSender = {
        send: sinon.fake()
      };
      // KubeClass
      let mockKubeClass = {
        getResourcesPaged: async (resourceMeta, queryParms) => { // eslint-disable-line no-unused-vars
          return Promise.reject(new Error('some http error'));
        }
      };
      // Poll
      var revertPoll = Poll.__set__({
        'util': util,
        'kc': mockKubeClass
      });
      // Test
      let handleSelection = Poll.__get__('handleSelector');
      let result = await handleSelection(metaResources, fakeSender, selector, resourceFormatter);
      revertPoll();

      assert.isFalse(result);
    });
  });

  describe('#handleWatchedNamespace', () => {
    it('success', async () => {
      // --- Given ---
      let selector = { 'labelSelector': 'razee/watch-resource in (heavy,detail,detailed)', 'limit': 500 };
      let resourceFormatter = Poll.__get__('resourceFormatter');
      // --- Mocks ---
      // Util
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      // DSA
      let fakeSender = {
        send: sinon.fake()
      };
      // KubeClass
      let mockKubeClass = {
        getResourcesPaged: async (resourceMeta, queryParms) => { // eslint-disable-line no-unused-vars
          return Promise.resolve({
            'resources': [{
              'resource-metadata': {
                'uri': '/api/v1/namespaces'
              },
              'statusCode': 200,
              'object': {
                'kind': 'NamespaceList',
                'apiVersion': 'v1',
                'metadata': {
                  'selfLink': '/api/v1/namespaces',
                  'resourceVersion': '14831957'
                },
                'items': [{ 'metadata': { 'name': 'myspace' } }]
              }
            }]
          });
        }
      };
      // Poll
      var revertPoll = Poll.__set__({
        'util': util,
        'kc': mockKubeClass,
        'handleSelector': async (metaResources, razeedashSender, selector, formatter) => { return Promise.resolve(true); }, // eslint-disable-line no-unused-vars
      });
      // Test
      let handleWatchedNamespaces = Poll.__get__('handleWatchedNamespaces');
      let result = await handleWatchedNamespaces(metaResources, fakeSender, selector, resourceFormatter);
      revertPoll();

      assert.isTrue(result);

    });
    it('failed', async () => {
      // --- Given ---
      let selector = { 'labelSelector': 'razee/watch-resource in (true,heavy,detail,detailed)', 'limit': 500 };
      let resourceFormatter = Poll.__get__('resourceFormatter');
      // --- Mocks ---
      // Util
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      // DSA
      let fakeSender = {
        send: sinon.fake()
      };
      // KubeClass
      let mockKubeClass = {
        getResourcesPaged: async (resourceMeta, queryParms) => { // eslint-disable-line no-unused-vars
          return Promise.reject(new Error('some http error'));
        }
      };
      // Poll
      var revertPoll = Poll.__set__({
        'util': util,
        'kc': mockKubeClass
      });
      // Test
      let handleWatchedNamespaces = Poll.__get__('handleWatchedNamespaces');
      let result = await handleWatchedNamespaces(metaResources, fakeSender, selector, resourceFormatter);
      revertPoll();

      assert.isFalse(result);
    });
  });
  describe('#resourceFormatter', () => {
    it('success', () => {
      let given = { 'metadata': { 'status': 'somestatus', 'name': 'kubernetes', 'namespace': 'default', 'selfLink': '/api/v1/namespaces/default/services/kubernetes', 'uid': '7c75c135-fca7-11e8-9f10-3a7d3a0f8cf2', 'resourceVersion': '10732560', 'creationTimestamp': '2018-12-10T18:14:51Z', 'labels': { 'component': 'apiserver', 'provider': 'kubernetes', 'razee/watch-resource': 'lite' } }, 'spec': { 'ports': [{ 'name': 'https', 'protocol': 'TCP', 'port': 443, 'targetPort': 2040 }], 'clusterIP': '172.21.0.1', 'type': 'ClusterIP', 'sessionAffinity': 'None' }, 'status': { 'loadBalancer': {} }, 'kind': 'Service', 'apiVersion': 'v1' };
      let expected = { 'metadata': { 'status': 'somestatus', 'name': 'kubernetes', 'namespace': 'default', 'selfLink': '/api/v1/namespaces/default/services/kubernetes', 'uid': '7c75c135-fca7-11e8-9f10-3a7d3a0f8cf2', 'resourceVersion': '10732560', 'creationTimestamp': '2018-12-10T18:14:51Z', 'labels': { 'component': 'apiserver', 'provider': 'kubernetes', 'razee/watch-resource': 'lite' } }, 'status': { 'loadBalancer': {} }, 'kind': 'Service', 'apiVersion': 'v1' };
      let resourceFormatter = Poll.__get__('resourceFormatter');
      let actual = resourceFormatter(given);
      assert.isTrue(deepEqual(actual, expected), JSON.stringify(actual));
    });
  });
  describe('#detailedResourceFormatter', () => {
    it('success', () => {
      let given = { 'metadata': { 'name': 'tiller-deploy', 'namespace': 'kube-system', 'selfLink': '/apis/apps/v1/namespaces/kube-system/deployments/tiller-deploy', 'uid': '348fe4de-fcb5-11e8-b9aa-96c5680c03b2', 'resourceVersion': '14840672', 'generation': 1, 'creationTimestamp': '2018-12-10T19:53:03Z', 'labels': { 'app': 'helm', 'name': 'tiller', 'razee/watch-resource': 'detailed' }, 'annotations': { 'deployment.kubernetes.io/revision': '1' } }, 'spec': { 'replicas': 1, 'selector': { 'matchLabels': { 'app': 'helm', 'name': 'tiller' } }, 'template': { 'metadata': { 'creationTimestamp': null, 'labels': { 'app': 'helm', 'name': 'tiller' } }, 'spec': { 'containers': [{ 'name': 'tiller', 'image': 'gcr.io/kubernetes-helm/tiller:v2.12.0', 'ports': [{ 'name': 'tiller', 'containerPort': 44134, 'protocol': 'TCP' }, { 'name': 'http', 'containerPort': 44135, 'protocol': 'TCP' }], 'env': [{ 'name': 'TILLER_NAMESPACE', 'value': 'kube-system' }, { 'name': 'TILLER_HISTORY_MAX', 'value': '0' }], 'resources': {}, 'livenessProbe': { 'httpGet': { 'path': '/liveness', 'port': 44135, 'scheme': 'HTTP' }, 'initialDelaySeconds': 1, 'timeoutSeconds': 1, 'periodSeconds': 10, 'successThreshold': 1, 'failureThreshold': 3 }, 'readinessProbe': { 'httpGet': { 'path': '/readiness', 'port': 44135, 'scheme': 'HTTP' }, 'initialDelaySeconds': 1, 'timeoutSeconds': 1, 'periodSeconds': 10, 'successThreshold': 1, 'failureThreshold': 3 }, 'terminationMessagePath': '/dev/termination-log', 'terminationMessagePolicy': 'File', 'imagePullPolicy': 'IfNotPresent' }], 'restartPolicy': 'Always', 'terminationGracePeriodSeconds': 30, 'dnsPolicy': 'ClusterFirst', 'serviceAccountName': 'tiller', 'serviceAccount': 'tiller', 'automountServiceAccountToken': true, 'securityContext': {}, 'schedulerName': 'default-scheduler' } }, 'strategy': { 'type': 'RollingUpdate', 'rollingUpdate': { 'maxUnavailable': 1, 'maxSurge': 1 } }, 'revisionHistoryLimit': 10, 'progressDeadlineSeconds': 600 }, 'status': { 'observedGeneration': 1, 'replicas': 1, 'updatedReplicas': 1, 'readyReplicas': 1, 'availableReplicas': 1, 'conditions': [{ 'type': 'Available', 'status': 'True', 'lastUpdateTime': '2018-12-10T19:53:03Z', 'lastTransitionTime': '2018-12-10T19:53:03Z', 'reason': 'MinimumReplicasAvailable', 'message': 'Deployment has minimum availability.' }, { 'type': 'Progressing', 'status': 'True', 'lastUpdateTime': '2018-12-10T19:53:18Z', 'lastTransitionTime': '2018-12-10T19:53:03Z', 'reason': 'NewReplicaSetAvailable', 'message': 'ReplicaSet \'tiller-deploy-8586bc5c8b\' has successfully progressed.' }] }, 'kind': 'Deployment', 'apiVersion': 'apps/v1' };
      let expected = { 'metadata': { 'name': 'tiller-deploy', 'namespace': 'kube-system', 'selfLink': '/apis/apps/v1/namespaces/kube-system/deployments/tiller-deploy', 'uid': '348fe4de-fcb5-11e8-b9aa-96c5680c03b2', 'resourceVersion': '14840672', 'generation': 1, 'creationTimestamp': '2018-12-10T19:53:03Z', 'labels': { 'app': 'helm', 'name': 'tiller', 'razee/watch-resource': 'detailed' }, 'annotations': { 'deployment.kubernetes.io/revision': '1' } }, 'spec': { 'replicas': 1, 'selector': { 'matchLabels': { 'app': 'helm', 'name': 'tiller' } }, 'template': { 'metadata': { 'creationTimestamp': null, 'labels': { 'app': 'helm', 'name': 'tiller' } }, 'spec': { 'containers': [{ 'name': 'tiller', 'image': 'gcr.io/kubernetes-helm/tiller:v2.12.0', 'ports': [{ 'name': 'tiller', 'containerPort': 44134, 'protocol': 'TCP' }, { 'name': 'http', 'containerPort': 44135, 'protocol': 'TCP' }], 'env': [{ 'name': 'TILLER_NAMESPACE', 'value': 'REDACTED' }, { 'name': 'TILLER_HISTORY_MAX', 'value': 'REDACTED' }], 'resources': {}, 'livenessProbe': { 'httpGet': { 'path': '/liveness', 'port': 44135, 'scheme': 'HTTP' }, 'initialDelaySeconds': 1, 'timeoutSeconds': 1, 'periodSeconds': 10, 'successThreshold': 1, 'failureThreshold': 3 }, 'readinessProbe': { 'httpGet': { 'path': '/readiness', 'port': 44135, 'scheme': 'HTTP' }, 'initialDelaySeconds': 1, 'timeoutSeconds': 1, 'periodSeconds': 10, 'successThreshold': 1, 'failureThreshold': 3 }, 'terminationMessagePath': '/dev/termination-log', 'terminationMessagePolicy': 'File', 'imagePullPolicy': 'IfNotPresent' }], 'restartPolicy': 'Always', 'terminationGracePeriodSeconds': 30, 'dnsPolicy': 'ClusterFirst', 'serviceAccountName': 'tiller', 'serviceAccount': 'tiller', 'automountServiceAccountToken': true, 'securityContext': {}, 'schedulerName': 'default-scheduler' } }, 'strategy': { 'type': 'RollingUpdate', 'rollingUpdate': { 'maxUnavailable': 1, 'maxSurge': 1 } }, 'revisionHistoryLimit': 10, 'progressDeadlineSeconds': 600 }, 'status': { 'observedGeneration': 1, 'replicas': 1, 'updatedReplicas': 1, 'readyReplicas': 1, 'availableReplicas': 1, 'conditions': [{ 'type': 'Available', 'status': 'True', 'lastUpdateTime': '2018-12-10T19:53:03Z', 'lastTransitionTime': '2018-12-10T19:53:03Z', 'reason': 'MinimumReplicasAvailable', 'message': 'Deployment has minimum availability.' }, { 'type': 'Progressing', 'status': 'True', 'lastUpdateTime': '2018-12-10T19:53:18Z', 'lastTransitionTime': '2018-12-10T19:53:03Z', 'reason': 'NewReplicaSetAvailable', 'message': 'ReplicaSet \'tiller-deploy-8586bc5c8b\' has successfully progressed.' }] }, 'kind': 'Deployment', 'apiVersion': 'apps/v1' };
      let detailedResourceFormatter = Poll.__get__('resourceFormatter');
      let actual = detailedResourceFormatter(given);
      assert.isTrue(deepEqual(actual, expected), JSON.stringify(actual));
    });
  });

  describe('#trimMetaResources', () => {
    it('success', async () => {
      // --- Mock ---
      // Util
      let util = new Util(TEST_RAZEEDASH_URL, 'good');

      // KubeClass
      let mockKubeClass = {
        getResource: async (resourceMeta, selector) => { // eslint-disable-line no-unused-vars
          return Promise.resolve({

            'resource-metadata': {
              '_path': '/api/v1',
              '_resourceMeta': {
                'name': 'namespaces',
                'singularName': '',
                'namespaced': false,
                'kind': 'Namespace',
                'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
                'shortNames': ['ns']
              }
            },
            'statusCode': 200,
            'object': {
              'kind': 'NamespaceList',
              'apiVersion': 'v1',
              'metadata': { 'selfLink': '/api/v1/namespaces', 'resourceVersion': '14988957' },
              'items': [
                { 'metadata': { 'name': 'default', 'selfLink': '/api/v1/namespaces/default', 'uid': '7c717875-fca7-11e8-9f10-3a7d3a0f8cf2', 'resourceVersion': '41', 'creationTimestamp': '2018-12-10T18:14:51Z' }, 'spec': { 'finalizers': ['kubernetes'] }, 'status': { 'phase': 'Active' } },
                { 'metadata': { 'name': 'ibm-cert-store', 'selfLink': '/api/v1/namespaces/ibm-cert-store', 'uid': '90009a8a-fca8-11e8-9f10-3a7d3a0f8cf2', 'resourceVersion': '940', 'creationTimestamp': '2018-12-10T18:22:33Z' }, 'spec': { 'finalizers': ['kubernetes'] }, 'status': { 'phase': 'Active' } },
                { 'metadata': { 'name': 'ibm-system', 'selfLink': '/api/v1/namespaces/ibm-system', 'uid': 'c7ec3bd2-fca7-11e8-a0e0-36848ff40b0b', 'resourceVersion': '359', 'creationTimestamp': '2018-12-10T18:16:57Z' }, 'spec': { 'finalizers': ['kubernetes'] }, 'status': { 'phase': 'Active' } },
                { 'metadata': { 'name': 'kube-public', 'selfLink': '/api/v1/namespaces/kube-public', 'uid': '7c886714-fca7-11e8-9f10-3a7d3a0f8cf2', 'resourceVersion': '59', 'creationTimestamp': '2018-12-10T18:14:51Z' }, 'spec': { 'finalizers': ['kubernetes'] }, 'status': { 'phase': 'Active' } },
                { 'metadata': { 'name': 'kube-system', 'selfLink': '/api/v1/namespaces/kube-system', 'uid': '7c5c952f-fca7-11e8-9f10-3a7d3a0f8cf2', 'resourceVersion': '30', 'creationTimestamp': '2018-12-10T18:14:51Z' }, 'spec': { 'finalizers': ['kubernetes'] }, 'status': { 'phase': 'Active' } }
              ]
            }
          });
        }
      };
      // Poll
      let mockReadWBList = async (resourceMeta, selector) => { // eslint-disable-line no-unused-vars
        return Promise.resolve({});
      };
      var revertPoll = Poll.__set__({
        'util': util,
        'kc': mockKubeClass,
        'readWBList': mockReadWBList
      });
      // Test
      let given = [{
        '_path': '/api/v1',
        'path': '/api/v1',
        'name': 'namespaces',
        'kind': 'Namespace',
        '_resourceMeta': {
          'name': 'namespaces',
          'singularName': '',
          'namespaced': false,
          'kind': 'Namespace',
          'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
          'shortNames': ['ns']
        }
      }];
      let expected = [{
        '_path': '/api/v1',
        'path': '/api/v1',
        'name': 'namespaces',
        'kind': 'Namespace',
        '_resourceMeta': {
          'name': 'namespaces',
          'singularName': '',
          'namespaced': false,
          'kind': 'Namespace',
          'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
          'shortNames': ['ns']
        }
      }];
      let trimMetaResources = Poll.__get__('trimMetaResources');
      let actual = await trimMetaResources(given);
      // console.dir(actual, { depth: null });
      assert.isTrue(deepEqual(actual, expected), JSON.stringify(actual));
      revertPoll();
    });
  });

  describe('#poll', () => {
    it('getKubeResourcesMeta throws error', async () => {
      // --- Mock ---
      // Util
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      // KubeClass
      let mockKubeClass = {
        getKubeResourcesMeta: async (verb) => { // eslint-disable-line no-unused-vars
          return Promise.reject(new Error('some getKubeResourcesMeta error'));
        }
      };
      // Poll
      var revertPoll = Poll.__set__({
        'util': util,
        'kc': mockKubeClass
      });
      let actual = await Poll.poll();
      assert.isFalse(actual);
      revertPoll();
    });
    it('trimMetaResources throws error', async () => {
      // --- Mock ---
      // Util
      let util = new Util(TEST_RAZEEDASH_URL, 'good');
      // KubeClass
      let mockKubeClass = {
        getKubeResourcesMeta: async (verb) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{
            '_path': '/api/v1',
            '_resourceMeta': {
              'name': 'namespaces',
              'singularName': '',
              'namespaced': false,
              'kind': 'Namespace',
              'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
              'shortNames': ['ns']
            }
          }]);
        }
      };

      // Poll
      var revertPoll = Poll.__set__({
        'util': util,
        'kc': mockKubeClass,
        'trimMetaResources': async (verb) => { // eslint-disable-line no-unused-vars
          return Promise.reject(new Error('some getKubeResourcesMeta error'));
        }
      });
      let actual = await Poll.poll();
      assert.isFalse(actual);
      revertPoll();
    });

    it('success', async () => {
      // --- Mock ---
      // Util
      var getClusterUid = {
        getClusterUid: async () => {
          return 'good';
        }
      };

      Util.__set__({
        'dc': getClusterUid
      });
      let util = await Util.fetch(TEST_RAZEEDASH_URL);

      // KubeClass
      let mockKubeClass = {
        getKubeResourcesMeta: async (verb) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{
            '_path': '/api/v1',
            '_resourceMeta': {
              'name': 'namespaces',
              'singularName': '',
              'namespaced': false,
              'kind': 'Namespace',
              'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
              'shortNames': ['ns']
            }
          }]);
        }
      };
      // Poll
      var revertPoll = Poll.__set__({
        'util': util,
        'kc': mockKubeClass,
        'trimMetaResources': async (resourceMeta) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{ '_path': '/api/v1', 'uri': () => '/api/v1/namespaces', '_resourceMeta': { 'name': 'namespaces', 'singularName': '', 'namespaced': false, 'kind': 'Namespace', 'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['ns'] } }]);
        }, 'handleSelector': async () => {
          return Promise.resolve(true);
        }, 'handleWatchedNamespaces': async () => {
          return Promise.resolve(true);
        }, 'handleNonNamespaced': async () => {
          return Promise.resolve(true);
        }
      });
      let actual = await Poll.poll();
      assert.isTrue(actual, 'should return true');
      revertPoll();
    });

    it('handleSelector returns false', async () => {
      // --- Mock ---
      // Util
      var getClusterUid = {
        getClusterUid: async () => {
          return 'good';
        }
      };
      Util.__set__('dc', getClusterUid);
      let util = await Util.fetch(TEST_RAZEEDASH_URL);
      // KubeClass
      let mockKubeClass = {
        getKubeResourcesMeta: async (verb) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{
            '_path': '/api/v1',
            '_resourceMeta': {
              'name': 'namespaces',
              'singularName': '',
              'namespaced': false,
              'kind': 'Namespace',
              'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
              'shortNames': ['ns']
            }
          }]);
        }
      };
      // Poll
      var revertPoll = Poll.__set__({
        'util': util,
        'kc': mockKubeClass,
        'trimMetaResources': async (resourceMeta) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{ '_path': '/api/v1', '_resourceMeta': { 'name': 'namespaces', 'singularName': '', 'namespaced': false, 'kind': 'Namespace', 'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['ns'] } }]);
        }, 'handleSelector': async () => {
          return Promise.resolve(false);
        }, 'handleWatchedNamespaces': async () => {
          return Promise.resolve(true);
        },
      });
      let actual = await Poll.poll();
      assert.isFalse(actual, 'should return false if handleSelector returns false');
      revertPoll();
    });

    it('handleWatchedNamespaces returns false', async () => {
      // --- Mock ---
      // Util
      var getClusterUid = {
        getClusterUid: async () => {
          return 'good';
        }
      };
      Util.__set__('dc', getClusterUid);
      let util = await Util.fetch(TEST_RAZEEDASH_URL);
      // KubeClass
      let mockKubeClass = {
        getKubeResourcesMeta: async (verb) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{
            '_path': '/api/v1',
            '_resourceMeta': {
              'name': 'namespaces',
              'singularName': '',
              'namespaced': false,
              'kind': 'Namespace',
              'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
              'shortNames': ['ns']
            }
          }]);
        }
      };
      // Poll
      var revertPoll = Poll.__set__({
        'util': util,
        'kc': mockKubeClass,
        'trimMetaResources': async (resourceMeta) => { // eslint-disable-line no-unused-vars
          return Promise.resolve([{ '_path': '/api/v1', '_resourceMeta': { 'name': 'namespaces', 'singularName': '', 'namespaced': false, 'kind': 'Namespace', 'verbs': ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'], 'shortNames': ['ns'] } }]);
        }, 'handleSelector': async () => {
          return Promise.resolve(true);
        }, 'handleWatchedNamespaces': async () => {
          return Promise.resolve(false);
        },
      });
      let actual = await Poll.poll();
      assert.isFalse(actual, 'should return false if handleWatchedNamespaces returns false');
      revertPoll();
    });
  });
});
