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
const nock = require('nock');

process.env.LOG_LEVEL = 'fatal';
const DelayedSendArray = require('../src/razeedash/DelayedSendArray');


describe('DelaySendArray', () => {
  const clusterID = '11a22b33c44d55e66f77g88h99i';
  const razeeOrgKey = 'orgApiKey-88888888-4444-4444-4444-121212121212';

  before(() => {
    process.env.RAZEEDASH_ORG_KEY = razeeOrgKey;
  });
  beforeEach(() => {});
  afterEach(() => {});
  after(() => {
    delete process.env.RAZEEDASH_ORG_KEY;
    delete process.env.LOG_LEVEL;
  });

  // ===========================================================================
  describe('#constructor()', () => {
    it('should fail on invalid url', () => {
      try {
        new DelayedSendArray('http//localhost@3000', clusterID);
        throw Error('should not successfully create a DelaySendArray instance');
      } catch (e) {
        assert.equal(e.message, 'http//localhost@3000 not valid.', 'should throw error when url is invalid');
      }
    });

    it('should fail when no clusterID passed', () => {
      try {
        new DelayedSendArray('http://localhost:3000');
        throw Error('should not successfully create a DelaySendArray instance');
      } catch (e) {
        assert.equal(e.message, 'clusterID must be defined', 'should throw error when clusterID is undefined');
      }
    });

    it('should allow https url', () => {
      new DelayedSendArray('https://localhost:3000', clusterID);
    });
  });

  // ===========================================================================
  describe('#flush()', () => {
    it('should return 0 when flush is called on an empty send array', () => {
      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID);
      let spy = sinon.spy(dsa, 'httpCall');
      dsa.flush();
      assert.isUndefined(dsa.flushTimeout, 'should not have a flush timeout');
      assert(spy.notCalled, 'should not call httpCall() when send array is empty');
    });
  });

  // ===========================================================================
  describe('#httpCall()', () => {

    before(function () {});
    after(function () {});

    // ---------- Success ----------
    it('should handle sending one object', async () => {
      let sendObject = { stuff: 'my special object' };
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/resources`, () => {
          return true;
        })
        .reply(200, { success: '¯\\_(ツ)_/¯' });

      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID, );
      let sent = await dsa.httpCall('POST', sendObject);

      assert.deepEqual(sent.statusCode, 200, 'should succeed sending data');
    });
    it('should handle retry on 500s and network errors', async () => {
      let sendObject = [{ stuff: 'my special object' }];
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/resources`, () => {
          return true;
        })
        .times(4)
        .reply(500, { failure: '¯\\_(ツ)_/¯' });
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/resources`, () => {
          return true;
        })
        .reply(200, { success: '¯\\_(ツ)_/¯' });

      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID);
      let sent = await dsa.httpCall('POST', sendObject, { retryDelay: 1 });

      assert.equal(sent.statusCode, 200, 'should succeed on final attempt');
    });

    // ---------- Failure ----------
    it('should fail retry on 500s and network errors', async () => {
      let sendObject = [{ stuff: 'my special object' }];
      let maxAttempts = 5;
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/resources`, () => {
          return true;
        })
        .times(maxAttempts)
        .reply(500, { failure: '¯\\_(ツ)_/¯' });

      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID);
      let sent = await dsa.httpCall('POST', sendObject, { retryDelay: 1, maxAttempts: maxAttempts });

      assert.deepEqual(sent.statusCode, 500, `should fail after ${maxAttempts}`);
    });

    it('should fail and catch on request errors', async () => {
      let sendObject = [{ stuff: 'my special object' }];
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/resources`, () => {
          return true;
        })
        .replyWithError('something awful happened');

      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID);
      let sent = await dsa.httpCall('POST', sendObject);
      assert.equal(sent.message, 'something awful happened', 'should fail and catch error');
    });
  });

  // ===========================================================================
  describe('#send()', () => {
    var clock;

    before(function () {
      clock = sinon.useFakeTimers();
    });
    after(function () {
      clock.restore();
    });

    // ---------- Success ----------
    it('should handle adding one object to be sent', async () => {
      let sendObject = { stuff: 'my special object' };
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/resources`, (body) => {
          assert.deepEqual(body, [sendObject], 'should be sending one object');
          return body;
        })
        .reply(200, { id: clusterID });

      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID);
      let spy = sinon.spy(dsa, 'httpCall');
      dsa.send(sendObject);
      assert.equal(dsa.sendObject.length, 1, 'should have added one object to send');
      clock.next();
      assert.equal((await spy.returnValues[0]).statusCode, 200, 'should have actually sent one object');
      spy.restore();
    });

    it('should handle adding multiple object to be sent', async () => {
      let sendObject = [{ one: 'my special object' }, { two: 'my special object' }, { three: 'my special object' }];
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/resources`, (body) => {
          assert.deepEqual(body, sendObject, 'should be sending three objects');
          return body;
        })
        .reply(200, { id: clusterID });

      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID);
      let spy = sinon.spy(dsa, 'httpCall');
      dsa.send(sendObject);
      assert.equal(dsa.sendObject.length, 3, 'should have added 3 objects to send');
      clock.next();
      assert.equal((await spy.returnValues[0]).statusCode, 200, 'should have actually sent three objects');
      spy.restore();
    });

    it('should send immediately when hitting max', async () => {
      let sendObject = [{ one: 'my special object' }, { two: 'my special object' }, { three: 'my special object' }];
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/resources`, (body) => {
          assert.deepEqual(body, sendObject, 'should be sending three objects');
          return body;
        })
        .reply(200, { id: clusterID });

      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID, 3, true);
      let spy = sinon.spy(dsa, 'httpCall');
      dsa.send(sendObject);
      assert.equal(dsa._sendPromises.length, 1, 'should have created 1 promise from send');
      assert.equal(dsa.sendObject.length, 0, 'should have empty sendObject because max was hit');
      assert.equal((await spy.returnValues[0]).statusCode, 200, 'should have actually sent three objects');
      spy.restore();
    });

    // ---------- Failure ----------
    it('should fail when sending non-object', async () => {
      let sendObject = 'not so good object';

      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID);
      try {
        dsa.send(sendObject);
        throw Error('should not successfully send non-objects');
      } catch (e) {
        assert.equal(e, 'Type string not supported.', 'should have thrown error when trying to send String');
      }
    });

    it('should fail when sending multiple non-objects', async () => {
      let sendObject = ['not so good object', 'not so good object', 'not so good object'];

      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID);
      try {
        dsa.send(sendObject);
        throw Error('should not successfully send non-objects');
      } catch (e) {
        assert.equal(e, 'Type string not supported.', 'should have thrown error when trying to send String');
      }
    });

    it('should handle non 200 statusCode', async () => {
      let sendObject = [{ stuff: 'my special object' }];
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/resources`, (body) => {
          assert.deepEqual(body, sendObject, 'should be sending one object');
          return body;
        })
        .reply(400, { failed: 'failureBody' });

      let dsa = new DelayedSendArray('http://localhost:3000/api/v2', clusterID);
      let sent = await dsa.httpCall('POST', sendObject);
      assert.deepEqual(sent.statusCode, 400, 'should have failed to send');
    });
  });

  // ===========================================================================
});
