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
const sinon = require('sinon');
const RazeedashSender = require('../src/razeedash/Sender');
const testResource = {
  type: 'POLLED',
  object: {
    metadata: {
      name: 'kubernetes-dashboard',
      namespace: 'kube-system',
      selfLink: '/api/v1/namespaces/kube-system/endpoints/kubernetes-dashboard',
      uid: 'b3156476-fca8-11e8-9f10-3a7d3a0f8cf2',
      resourceVersion: '10739693',
      creationTimestamp: '2018-12-10T18:23:32Z',
      labels: {
        'addonmanager.kubernetes.io/mode': 'Reconcile',
        'k8s-app': 'kubernetes-dashboard',
        'kubernetes.io/cluster-service': 'true',
        'razee/watch-resource': 'lite'
      }
    }
  }
};
const otherResource = {
  type: 'POLLED',
  object: {
    metadata: {
      name: 'hello-world',
      namespace: 'kube-system',
      selfLink: '/api/v1/namespaces/kube-system/endpoints/hello-world',
      uid: 'b3156476-fca8-11e8-9f10-3xxxxxxxx2',
      resourceVersion: '10739693',
      creationTimestamp: '2018-12-10T18:23:32Z',
      labels: {
        'addonmanager.kubernetes.io/mode': 'Reconcile',
        'k8s-app': 'hello-world',
        'kubernetes.io/cluster-service': 'true',
        'razee/watch-resource': 'lite'
      }
    }
  }
};
process.env.LOG_LEVEL = 'info';



describe('Sender', () => {
  before(() => { });
  beforeEach(() => { });
  afterEach(() => { });
  after(() => { });

  // ===========================================================================
  describe('send', () => {

    it('should send non-array data', () => {
      let fakeDSA = {
        send: sinon.fake(),
        maxItems: 5,
        flush: sinon.fake()
      };
      let sender = new RazeedashSender(fakeDSA);
      sender.send(testResource); // call with object
      assert(fakeDSA.send.called); // should be called
      assert(fakeDSA.send.calledWith([testResource])); // should be called as an array
      assert.equal(sender.resourceCount, 1);
    });

    it('should send array data', () => {
      let fakeDSA = {
        send: sinon.fake(),
        maxItems: 5,
        flush: sinon.fake()
      };
      let sender = new RazeedashSender(fakeDSA);
      sender.send([testResource]); // call with array
      assert(fakeDSA.send.called); // should be called
      assert(fakeDSA.send.calledWith([testResource])); // should be called as an array
      assert.equal(sender.resourceCount, 1);
    });

    it('should not send duplicate data', () => {
      let fakeDSA = {
        send: sinon.fake(),
        maxItems: 5,
        flush: sinon.fake()
      };
      let sender = new RazeedashSender(fakeDSA);
      sender.send([testResource, testResource]);
      assert(fakeDSA.send.called); // should be called
      assert(fakeDSA.send.calledWith([testResource])); // should only send one item based on selfLink
      assert.equal(sender.resourceCount, 1);
    });

    it('should send both resources', () => {
      let fakeDSA = {
        send: sinon.fake(),
        maxItems: 5,
        flush: sinon.fake()
      };
      let sender = new RazeedashSender(fakeDSA);
      sender.send([testResource, otherResource]);
      assert(fakeDSA.send.called); // should be called
      assert(fakeDSA.send.calledWith([testResource, otherResource])); // should only send one item based on selfLink
      assert.equal(sender.resourceCount, 2);
    });

    it('should reset', () => {
      let fakeDSA = {
        send: sinon.fake(),
        maxItems: 5,
        flush: sinon.fake()
      };
      let sender = new RazeedashSender(fakeDSA);
      sender.reset(); // call with object
      assert(fakeDSA.flush.called); // should be called
    });

    it('should flush', () => {
      let fakeDSA = {
        send: sinon.fake(),
        maxItems: 5,
        flush: sinon.fake()
      };
      let sender = new RazeedashSender(fakeDSA);
      sender.flush(); // call with object
      assert(fakeDSA.flush.called); // should be called
    });

    it('should be 5', () => {
      let fakeDSA = {
        send: sinon.fake(),
        maxItems: 5,
        flush: sinon.fake()
      };
      let sender = new RazeedashSender(fakeDSA);
      sender.flush(); // call with object
      assert.equal(sender.maxItems, 5); // should be called
    });

    it('should send SYNC message and reset', () => {
      let fakeDSA = {
        send: sinon.fake(),
        maxItems: 5,
        flush: sinon.fake()
      };
      let sender = new RazeedashSender(fakeDSA);
      sender.send([testResource]);
      sender.sendPollSummary();
      assert(fakeDSA.send.calledTwice);
      assert.equal(fakeDSA.send.secondCall.args[0].type, 'SYNC');
      assert.equal(fakeDSA.send.secondCall.args[0].object, '/api/v1/namespaces/kube-system/endpoints/kubernetes-dashboard');
    });
  });
});
