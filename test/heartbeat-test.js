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
const Config = require('../src/Config');

Config.logLevel = 'fatal';
const Heartbeat = require('../src/razeedash/Heartbeat');


describe('Heartbeat', () => {
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
    it('should fail on invalid url', () => {
      try {
        new Heartbeat('http//localhost@3000', clusterID);
        throw Error('should not successfully create a DelaySendArray instance');
      } catch (e) {
        assert.equal(e.message, 'http//localhost@3000 not valid.', 'should throw error when url is invalid');
      }
    });

    it('should fail when no clusterID passed', () => {
      try {
        new Heartbeat('http://localhost:3000');
        throw Error('should not successfully create a DelaySendArray instance');
      } catch (e) {
        assert.equal(e.message, 'clusterID must be defined', 'should throw error when clusterID is undefined');
      }
    });

    it('should allow https url', () => {
      new Heartbeat('https://localhost:3000', clusterID);
    });
  });

  // ===========================================================================
  describe('#heartbeat()', () => {
    // ---------- Success ----------
    it('should get false on successful heartbeat', async () => {
      let customMeta = { somedata: '¯\\_(ツ)_/¯' };
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}`, (body) => {
          assert.deepEqual(body, customMeta, 'should be customMeta object');
          return body;
        })
        .reply(200, { so: 'cool' });

      let hb = new Heartbeat('http://localhost:3000/api/v2', clusterID);
      let sent = await hb.heartbeat(customMeta);
      assert.isFalse(sent, 'should get false on 200 response code');
    });

    it('should get true on successful and flagged heartbeat', async () => {
      let customMeta = { somedata: '¯\\_(ツ)_/¯' };
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}`, (body) => {
          assert.deepEqual(body, customMeta, 'should be customMeta object');
          return body;
        })
        .reply(205, { so: 'cool' });

      let hb = new Heartbeat('http://localhost:3000/api/v2', clusterID);
      let sent = await hb.heartbeat(customMeta);
      assert.isTrue(sent, 'should return true on 205 response code');
    });

    // ---------- Failure ----------
    it('should get false on failed heartbeat', async () => {
      let customMeta = { somedata: '¯\\_(ツ)_/¯' };
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}`, (body) => {
          assert.deepEqual(body, customMeta, 'should be customMeta object');
          return body;
        })
        .reply(403, { so: 'cool' });

      let hb = new Heartbeat('http://localhost:3000/api/v2', clusterID);
      let sent = await hb.heartbeat(customMeta);
      assert.isFalse(sent, 'should catch error and return false');
    });

    it('should get false on request error', async () => {
      let customMeta = { somedata: '¯\\_(ツ)_/¯' };
      nock('http://localhost:3000')
        .post(`/api/v2/clusters/${clusterID}`, (body) => {
          assert.deepEqual(body, customMeta, 'should be customMeta object');
          return body;
        })
        .replyWithError('something awful happened');

      let hb = new Heartbeat('http://localhost:3000/api/v2', clusterID);
      let sent = await hb.heartbeat(customMeta);
      assert.isFalse(sent, 'should catch error and return false');
    });
  });

  // ===========================================================================
});
