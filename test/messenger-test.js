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

const Messenger = require('../src/razeedash/Messenger');
const Config = require('../src/Config');


describe('Messenger', () => {
  const clusterID = '11a22b33c44d55e66f77g88h99i';
  const razeeOrgKey = 'orgApiKey-88888888-4444-4444-4444-121212121212';

  before(() => {
    Config.orgKey = razeeOrgKey;
  });
  beforeEach(() => {});
  afterEach(() => {});
  after(() => {
    Config.orgKey = '';
    Config.logLevel = '';
  });

  // ===========================================================================
  describe('#constructor()', () => {
    // ---------- Success ----------
    it('should allow undefined clusterID', () => {
      new Messenger('http://localhost:3000');
    });

    it('should allow https url', () => {
      new Messenger('https://localhost:3000', clusterID);
    });

    // ---------- Failure ----------
    it('should fail on invalid url', () => {
      try {
        new Messenger('http//localhost@3000', clusterID);
        throw Error('should not successfully create a Messenger instance');
      } catch (e) {
        assert.equal(e.message, 'http//localhost@3000 not valid.', 'should throw error when url is invalid');
      }
    });


  });

  // ===========================================================================
  describe('#error()', async () => {
    // ---------- Success ----------
    it('should handle posting under normal conditions', async () => {
      let errObject = Error('some wacky error ¯\\_(ツ)_/¯');
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/messages`, () => { return true; })
        .reply(200, function (uri, requestBody) {
          assert.exists(this.req.headers['razee-org-key']);
          return requestBody;
        });

      let messenger = new Messenger('http://localhost:3000/api/v2', clusterID);
      let rsp = await messenger.error(errObject.message);
      assert.equal(rsp.statusCode, 200, 'should get a successful message posting');
    });
  });

  // ===========================================================================
  describe('#warn()', async () => {
    // ---------- Success ----------
    it('should handle posting under normal conditions', async () => {
      let warning = 'some wacky warning ¯\\_(ツ)_/¯';
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/messages`, () => { return true; })
        .reply(200, function (uri, requestBody) {
          assert.exists(this.req.headers['razee-org-key']);
          return requestBody;
        });

      let messenger = new Messenger('http://localhost:3000/api/v2', clusterID);
      let rsp = await messenger.warn(warning);
      assert.equal(rsp.statusCode, 200, 'should get a successful message posting');
    });
  });

  // ===========================================================================
  describe('#info()', async () => {
    // ---------- Success ----------
    it('should handle posting under normal conditions', async () => {
      let info = 'some wacky msg ¯\\_(ツ)_/¯';
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/messages`, () => { return true; })
        .reply(200, function (uri, requestBody) {
          assert.exists(this.req.headers['razee-org-key']);
          return requestBody;
        });

      let messenger = new Messenger('http://localhost:3000/api/v2', clusterID);
      let rsp = await messenger.info(info);
      assert.equal(rsp.statusCode, 200, 'should get a successful message posting');
    });

  });

  // ===========================================================================
  describe('#message()', () => {
    // ---------- Success ----------
    it('should handle posting under normal conditions', async () => {
      let info = 'some wacky msg ¯\\_(ツ)_/¯';
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/messages`, () => { return true; })
        .reply(200, function (uri, requestBody) {
          assert.exists(this.req.headers['razee-org-key']);
          return requestBody;
        });

      let messenger = new Messenger('http://localhost:3000/api/v2', clusterID);
      let rsp = await messenger.message('INFO', info, { message: info });
      assert.equal(rsp.statusCode, 200, 'should get a successful message posting');
    });

    it('should handle posting when clusterID is undefined', async () => {
      let errObject = Error('some wacky error ¯\\_(ツ)_/¯');
      nock('http://localhost:3000')
        .post('/api/v2/messages', () => { return true; })
        .reply(200, function (uri, requestBody) {
          assert.exists(this.req.headers['razee-org-key']);
          return requestBody;
        });

      let messenger = new Messenger('http://localhost:3000/api/v2');
      let rsp = await messenger.message('ERROR', errObject.message, errObject);
      assert.equal(rsp.statusCode, 200, 'should get a successful message posting');
    });

    it('should handle retry on 500s and network errors', async () => {
      let msg = 'some wacky msg ¯\\_(ツ)_/¯';
      let maxAttempts = 5;
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/messages`, () => { return true; })
        .times(maxAttempts - 1)
        .reply(500, function () {
          assert.exists(this.req.headers['razee-org-key']);
          return { statusCode: 500, failure: '¯\\_(ツ)_/¯' };
        });
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/messages`, () => { return true; })
        .reply(200, function (uri, requestBody) {
          assert.exists(this.req.headers['razee-org-key']);
          return requestBody;
        });

      let messenger = new Messenger('http://localhost:3000/api/v2', clusterID);
      let rsp = await messenger.message('INFO', msg, undefined, { retryDelay: 1, maxAttempts: maxAttempts });
      assert.equal(rsp.statusCode, 200, 'should get a successful message posting on final attempt');
    });

    // ---------- Failure ----------
    it('should return error after max retries', async () => {
      let msg = 'some wacky msg ¯\\_(ツ)_/¯';
      let maxAttempts = 5;
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}/messages`, () => { return true; })
        .times(maxAttempts)
        .reply(500, function () {
          assert.exists(this.req.headers['razee-org-key']);
          return { statusCode: 500, failure: '¯\\_(ツ)_/¯' };
        });

      let messenger = new Messenger('http://localhost:3000/api/v2', clusterID);
      let rsp = await messenger.message('INFO', msg, undefined, { retryDelay: 1, maxAttempts: maxAttempts });
      assert.equal(rsp.statusCode, 500, `should fail after ${maxAttempts}`);
    });
  });

  // ===========================================================================
});
