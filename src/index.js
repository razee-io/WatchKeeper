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
const touch = require('touch');
const promiseRetry = require('promise-retry');
const fs = require('fs-extra');
const log = require('./bunyan-api').createLogger('Index');

const Util = require('./controllers/Util');
var util;
const watchController = require('./controllers/Watch');
const pollController = require('./controllers/Poll');



async function main() {
  let validateInterval = parseInt(process.env.VALIDATE_INTERVAL || 10); // how many minutes until validate correct watches are being tracked
  let pollInterval = parseInt(process.env.POLL_INTERVAL || 60); // how many minutes until poll all watched resources and namespaces and send to razee
  let cleanStartInterval = parseInt(process.env.CLEAN_START_INTERVAL || 1440); // how many minutes until wiping/re-create all watches and restart interval count

  if (cleanStartInterval < pollInterval || pollInterval < validateInterval) {
    log.warn(`Intervals should follow: CLEAN_START_INTERVAL(${cleanStartInterval}) > POLL_INTERVAL(${pollInterval}) > VALIDATE_INTERVAL(${validateInterval})`);
  }

  touch('/tmp/liveness');
  await watchController.watch();
  pollController.poll();

  let interval = 0;
  setInterval(async () => {
    ++interval;
    log.info(`Starting Next Interval: ${interval} ============`);
    touch('/tmp/liveness');

    if ((interval / cleanStartInterval) % 1 == 0) {
      // wiping/re-create all watches and restart interval count
      log.info('Running Clean Start ============');
      interval = 0;
      watchController.removeAllWatches();
      watchController.watch();
    } else if ((interval / validateInterval) % 1 == 0) {
      // validate correct watches are being tracked
      watchController.watch();
    }

    let refresh = await util.heartbeat();
    if (refresh || ((interval / pollInterval) % 1 == 0)) {
      // poll all watched resources and namespaces and send to razee
      pollController.poll();
    }
  }, 60000);
}


async function init() {
  try {
    await setEnvs();
    util = await Util.fetch();
  } catch (e) {
    const Messenger = require('./razeedash/Messenger');
    let msngr = new Messenger(process.env.RAZEEDASH_URL || 'http://localhost:3000/api/v2');
    log.error('Error fetching clusterID on startup.', e);
    msngr.error('Error fetching clusterID on startup.', e);
    return Promise.reject(e);
  }
  try {
    let startDelayMax = parseInt(process.env.START_DELAY_MAX || 10);
    let startDelay = Math.floor(Math.random() * startDelayMax * 60000); // (0 to 1) * maxTimeout * in minutes
    log.info(`Staggering start by ${startDelay / 60000} minutes`);
    await new Promise(resolve => setTimeout(resolve, startDelay));

    await util.heartbeat();
  } catch (e) {
    util.error('Error fetching custom cluster metadata on startup.', e);
    return Promise.reject(e);
  }
  main();
  return true;
}

function createEventListeners() {
  process.on('SIGTERM', () => {
    log.info('recieved SIGTERM. not handling at this time.');
  });
  process.on('unhandledRejection', (reason) => {
    log.error('recieved unhandledRejection', reason);
  });
  process.on('beforeExit', (code) => {
    log.info(`No work found. exiting with code: ${code}`);
  });

}

async function run() {
  try {
    createEventListeners();
    await promiseRetry({ retries: 5 },
      retry => {
        return init().catch(retry);
      });
  } catch (error) {
    log.error('Failed to init watchkeeper', error);
  }

}

async function setEnvs() {
  const env = process.env;

  // Razee Config
  if (await fs.pathExists('envs/watch-keeper-config/RAZEEDASH_URL')) {
    env.RAZEEDASH_URL = (await fs.readFile('envs/watch-keeper-config/RAZEEDASH_URL', 'utf8')).trim();
  } else if (await fs.pathExists('envs/razee-identity-config/RAZEE_API')) {
    let razeeApi = (await fs.readFile('envs/razee-identity-config/RAZEE_API', 'utf8')).trim();
    env.RAZEEDASH_URL = `${razeeApi.replace(/\/+$/, '')}/api/v2`;
  } else {
    log.error('failed to find Razee url to post data to. exiting(1)');
    process.exit(1);
  }
  if (await fs.pathExists('envs/razee-identity-secret/RAZEE_ORG_KEY')) {
    env.RAZEEDASH_ORG_KEY = (await fs.readFile('envs/razee-identity-secret/RAZEE_ORG_KEY', 'utf8')).trim();
  } else if (await fs.pathExists('envs/watch-keeper-secret/RAZEEDASH_ORG_KEY')) {
    env.RAZEEDASH_ORG_KEY = (await fs.readFile('envs/watch-keeper-secret/RAZEEDASH_ORG_KEY', 'utf8')).trim();
  }
  if (await fs.pathExists('envs/razee-identity-config/CLUSTER_ID')) {
    env.CLUSTER_ID_OVERRIDE = (await fs.readFile('envs/razee-identity-config/CLUSTER_ID', 'utf8')).trim();
  } else if (await fs.pathExists('envs/watch-keeper-config/CLUSTER_ID_OVERRIDE')) {
    env.CLUSTER_ID_OVERRIDE = (await fs.readFile('envs/watch-keeper-config/CLUSTER_ID_OVERRIDE', 'utf8')).trim();
  }
  if (await fs.pathExists('envs/razee-identity-config/CLUSTER_NAME')) {
    env.DEFAULT_CLUSTER_NAME = (await fs.readFile('envs/razee-identity-config/CLUSTER_NAME', 'utf8')).trim();
  } else if (await fs.pathExists('envs/watch-keeper-config/DEFAULT_CLUSTER_NAME')) {
    env.DEFAULT_CLUSTER_NAME = (await fs.readFile('envs/watch-keeper-config/DEFAULT_CLUSTER_NAME', 'utf8')).trim();
  }

  // Watch-keeper Specific Config
  if (await fs.pathExists('envs/watch-keeper-config/START_DELAY_MAX')) {
    env.START_DELAY_MAX = (await fs.readFile('envs/watch-keeper-config/START_DELAY_MAX', 'utf8')).trim();
  }
  if (await fs.pathExists('envs/watch-keeper-config/CONFIG_NAMESPACE')) {
    env.CONFIG_NAMESPACE = (await fs.readFile('envs/watch-keeper-config/CONFIG_NAMESPACE', 'utf8')).trim();
  }
  if (await fs.pathExists('envs/watch-keeper-config/VALIDATE_INTERVAL')) {
    env.VALIDATE_INTERVAL = (await fs.readFile('envs/watch-keeper-config/VALIDATE_INTERVAL', 'utf8')).trim();
  }
  if (await fs.pathExists('envs/watch-keeper-config/POLL_INTERVAL')) {
    env.POLL_INTERVAL = (await fs.readFile('envs/watch-keeper-config/POLL_INTERVAL', 'utf8')).trim();
  }
  if (await fs.pathExists('envs/watch-keeper-config/CLEAN_START_INTERVAL')) {
    env.CLEAN_START_INTERVAL = (await fs.readFile('envs/watch-keeper-config/CLEAN_START_INTERVAL', 'utf8')).trim();
  }
  if (await fs.pathExists('envs/watch-keeper-config/LOG_LEVEL')) {
    env.LOG_LEVEL = (await fs.readFile('envs/watch-keeper-config/LOG_LEVEL', 'utf8')).trim();
  }
}

module.exports = {
  run
};
