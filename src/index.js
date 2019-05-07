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

  touch('/tmp/healthy');
  await watchController.watch();
  pollController.poll();

  let interval = 0;
  setInterval(async () => {
    ++interval;
    log.info(`Starting Next Interval: ${interval} ============`);
    touch('/tmp/healthy');

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
promiseRetry({ retries: 5 },
  retry => {
    return init().catch(retry);
  }).catch(err => log.error(`Failed to init watch-keeper | ${err}`));
