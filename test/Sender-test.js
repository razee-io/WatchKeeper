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
const sandbox = sinon.createSandbox();
const RazeedashSender = require('../src/razeedash/Sender');
const DelayedSendArray = require('../src/razeedash/DelayedSendArray');
const Config = require('../src/Config');

const testResource = {
  type: 'POLLED',
  object: {
    metadata: {
      name: 'kubernetes-dashboard',
      namespace: 'kube-system',
      uid: 'b3156476-fca8-11e8-9f10-3a7d3a0f8cf2',
      resourceVersion: '10739693',
      creationTimestamp: '2018-12-10T18:23:32Z',
      labels: {
        'addonmanager.kubernetes.io/mode': 'Reconcile',
        'k8s-app': 'kubernetes-dashboard',
        'kubernetes.io/cluster-service': 'true',
        'razee/watch-resource': 'lite'
      },
      annotations: {
        selfLink: '/api/v1/namespaces/kube-system/endpoints/kubernetes-dashboard',
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
      uid: 'b3156476-fca8-11e8-9f10-3xxxxxxxx2',
      resourceVersion: '10739693',
      creationTimestamp: '2018-12-10T18:23:32Z',
      labels: {
        'addonmanager.kubernetes.io/mode': 'Reconcile',
        'k8s-app': 'hello-world',
        'kubernetes.io/cluster-service': 'true',
        'razee/watch-resource': 'lite'
      },
      annotations: {
        selfLink: '/api/v1/namespaces/kube-system/endpoints/hello-world',
      }
    }
  }
};

Config.logLevel = 'info';

describe('Sender', () => {
  before(() => {});
  beforeEach(() => {});
  afterEach(() => {
    // completely restore all fakes created through the sandbox
    sandbox.restore();
  });
  after(() => {});

  // ===========================================================================
  describe('send', () => {

    it('should send non-array data', () => {
      let send = sandbox.fake();
      sandbox.stub(DelayedSendArray.prototype, 'send').callsFake(send);
      let sender = new RazeedashSender('fakeClusterID');

      sender.send(testResource); // call with object
      assert(send.called); // should be called
      assert(send.calledWith([testResource])); // should be called as an array
      assert.equal(sender.resourceCount, 1);
    });

    it('should send array data', () => {
      let send = sandbox.fake();
      sandbox.stub(DelayedSendArray.prototype, 'send').callsFake(send);
      let sender = new RazeedashSender('fakeClusterID');

      sender.send([testResource]); // call with array
      assert(send.called); // should be called
      assert(send.calledWith([testResource])); // should be called as an array
      assert.equal(sender.resourceCount, 1);
    });

    it('should not send duplicate data', () => {
      let send = sandbox.fake();
      sandbox.stub(DelayedSendArray.prototype, 'send').callsFake(send);
      let sender = new RazeedashSender('fakeClusterID');

      sender.send([testResource, testResource]);
      assert(send.called); // should be called
      assert(send.calledWith([testResource])); // should only send one item based on selfLink
      assert.equal(sender.resourceCount, 1);
    });

    it('should send both resources', () => {
      let send = sandbox.fake();
      sandbox.stub(DelayedSendArray.prototype, 'send').callsFake(send);
      let sender = new RazeedashSender('fakeClusterID');

      sender.send([testResource, otherResource]);
      assert(send.called); // should be called
      assert(send.calledWith([testResource, otherResource])); // should only send one item based on selfLink
      assert.equal(sender.resourceCount, 2);
    });

    it('should reset', () => {
      let sender = new RazeedashSender('fakeClusterID');

      sender.reset(); // call with object
      assert.equal(Object.keys(sender._sentSelflinks).length, 0, 'should reset all known sent selflinks');
    });

    it('should flush', () => {
      sandbox.stub(DelayedSendArray.prototype, 'flush').returns('success');
      let sender = new RazeedashSender('fakeClusterID');

      sender.flush(); // call with object
      assert(sender._dsa.flush.called); // should be called
    });

    it('maxItems should match delaySendArray default', () => {
      let sender = new RazeedashSender('fakeClusterID');

      assert.equal(sender.maxItems, 50); // should be called
    });

    it('should send SYNC message to new endpoint', async () => {
      sandbox.stub(DelayedSendArray.prototype, 'getSendPromises').returns('success');
      let httpCall = sandbox.stub(DelayedSendArray.prototype, 'httpCall').returns(200);
      let sender = new RazeedashSender('fakeClusterID');

      sender.send([testResource]);
      await sender.sendPollComplete();
      assert.isTrue(httpCall.calledTwice, 'should call httpCall twice');
      assert.equal(httpCall.secondCall.args[1].type, 'SYNC');
    });

    it('should send SYNC message to old endpoint when new one doesnt exist', async () => {
      sandbox.stub(DelayedSendArray.prototype, 'getSendPromises').returns('success');
      let httpCall = sandbox.stub(DelayedSendArray.prototype, 'httpCall')
        .onFirstCall().returns({ statusCode: 200 })
        .onSecondCall().returns({ statusCode: 404 })
        .onThirdCall().returns({ statusCode: 200 });
      let sender = new RazeedashSender('fakeClusterID');

      sender.send([testResource]);
      await sender.sendPollComplete();
      assert.isTrue(httpCall.calledThrice, 'should call httpCall thrice');
      assert.equal(httpCall.secondCall.args[1].count, '1', 'should send count on second call');
      assert.exists(httpCall.thirdCall.args[1][0].object, 'should send selfLink array on third call');
    });

  });
});
