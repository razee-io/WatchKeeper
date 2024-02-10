/**
 * Copyright 2022 IBM Corp. All Rights Reserved.
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

const fs = require('fs-extra');
const chokidar = require('chokidar');

module.exports = class Config {
  static razeedashUrlPath1 = 'envs/watch-keeper-config/RAZEEDASH_URL';
  static razeedashUrlPath2 = 'envs/razee-identity-config/RAZEE_API';
  static orgKeyPath1 = 'envs/razee-identity-secret/RAZEE_ORG_KEY';
  static orgKeyPath2 = 'envs/watch-keeper-secret/RAZEEDASH_ORG_KEY';
  static clusterIdPath1 = 'envs/razee-identity-config/CLUSTER_ID';
  static clusterIdPath2 = 'envs/watch-keeper-config/CLUSTER_ID_OVERRIDE';
  static clusterNamePath1 = 'envs/razee-identity-config/CLUSTER_NAME';
  static clusterNamePath2 = 'envs/watch-keeper-config/DEFAULT_CLUSTER_NAME';

  static startDelayMaxPath = 'envs/watch-keeper-config/START_DELAY_MAX';
  static configNamespacePath = 'envs/watch-keeper-config/CONFIG_NAMESPACE';
  static validateIntervalPath = 'envs/watch-keeper-config/VALIDATE_INTERVAL';
  static pollIntervalPath = 'envs/watch-keeper-config/POLL_INTERVAL';
  static cleanStartIntervalPath = 'envs/watch-keeper-config/CLEAN_START_INTERVAL';
  static logLevelPath = 'envs/watch-keeper-config/LOG_LEVEL';

  static razeedashUrl = process.env.RAZEEDASH_URL;
  static orgKey = process.env.RAZEEDASH_ORG_KEY;
  static clusterId = process.env.CLUSTER_ID_OVERRIDE;
  static clusterName = process.env.DEFAULT_CLUSTER_NAME;
  static startDelayMax = process.env.START_DELAY_MAX;
  static configNamespace = process.env.CONFIG_NAMESPACE;
  static validateInterval = process.env.VALIDATE_INTERVAL;
  static pollInterval = process.env.POLL_INTERVAL;
  static cleanStartInterval = process.env.CLEAN_START_INTERVAL;
  static logLevel = process.env.LOG_LEVEL;

  static watcher;

  static async readRazeedashUrl() {
    if (await fs.pathExists(this.razeedashUrlPath1)) {
      this.razeedashUrl = ((await fs.readFile(this.razeedashUrlPath1, 'utf8')).trim() || this.razeedashUrl);
    } else if (await fs.pathExists(this.razeedashUrlPath2)) {
      let razeeApi = (await fs.readFile(this.razeedashUrlPath2, 'utf8')).trim();
      this.razeedashUrl = `${razeeApi.replace(/\/+$/, '')}/api/v2`;
    }
  }

  static async readOrgKey() {
    if (await fs.pathExists(this.orgKeyPath1)) {
      this.orgKey = ((await fs.readFile(this.orgKeyPath1, 'utf8')).trim() || this.orgKey);
    } else if (await fs.pathExists(this.orgKeyPath2)) {
      this.orgKey = ((await fs.readFile(this.orgKeyPath2, 'utf8')).trim() || this.orgKey);
    }
  }

  static async readClusterId() {
    let fileToRead;
    if (await fs.pathExists(this.clusterIdPath1)) {
      fileToRead = this.clusterIdPath1;
    } else if (await fs.pathExists(this.clusterIdPath2)) {
      fileToRead = this.clusterIdPath2;
    }
    if( fileToRead ) {
      const newClusterId = (await fs.readFile(fileToRead, 'utf8')).trim();
      // If the cluster id file exists it must contain a valid ID -- restart to try again
      if( !newClusterId ) throw new Error( 'invalid cluster id: (empty string)' );
      // If the cluster id file was created or modified, watch-keeper must restart
      if( this.clusterId && this.clusterId != newClusterId ) throw new Error( 'watch-keeper does not support changing cluster id dynamically' );
      this.clusterId = newClusterId;
    }
  }

  static async readClusterName() {
    if (await fs.pathExists(this.clusterNamePath1)) {
      this.clusterName = ((await fs.readFile(this.clusterNamePath1, 'utf8')).trim() || this.clusterName);
    } else if (await fs.pathExists(this.clusterNamePath2)) {
      this.clusterName = ((await fs.readFile(this.clusterNamePath2, 'utf8')).trim() || this.clusterName);
    }
  }

  static async readStartDelaymax() {
    if (await fs.pathExists(this.startDelayMaxPath)) {
      this.startDelayMax = ((await fs.readFile(this.startDelayMaxPath, 'utf8')).trim() || this.startDelayMax);
    }
  }

  static async readConfigNamespace() {
    if (await fs.pathExists(this.configNamespacePath)) {
      this.configNamespace = ((await fs.readFile(this.configNamespacePath, 'utf8')).trim() || this.configNamespace);
    }
  }

  static async readValidateInterval() {
    if (await fs.pathExists(this.validateIntervalPath)) {
      this.validateInterval = ((await fs.readFile(this.validateIntervalPath, 'utf8')).trim() || this.validateInterval);
    }
  }

  static async readPollInterval() {
    if (await fs.pathExists(this.pollIntervalPath)) {
      this.pollInterval = ((await fs.readFile(this.pollIntervalPath, 'utf8')).trim() || this.pollInterval);
    }
  }

  static async readCleanStartInterval() {
    if (await fs.pathExists(this.cleanStartIntervalPath)) {
      this.cleanStartInterval = ((await fs.readFile(this.cleanStartIntervalPath, 'utf8')).trim() || this.cleanStartInterval);
    }
  }

  static async readLogLevel() {
    if (await fs.pathExists(this.logLevelPath)) {
      this.logLevel = ((await fs.readFile(this.logLevelPath, 'utf8')).trim() || this.logLevel);
    }
  }

  static async init() {
    await this.readRazeedashUrl();
    await this.readOrgKey();
    await this.readClusterId();
    await this.readClusterName();
    await this.readStartDelaymax();
    await this.readConfigNamespace();
    await this.readValidateInterval();
    await this.readPollInterval();
    await this.readCleanStartInterval();
    await this.readLogLevel();
  }

  static {
    this.watcher = chokidar.watch('./envs/', { ignoreInitial: true }).on('all', (event, path) => {
      if (event === 'add' || event === 'change') {
        try {
          if (path === this.razeedashUrlPath1 || path === this.razeedashUrlPath2) {
            this.readRazeedashUrl();
          }

          if (path === this.orgKeyPath1 || path === this.orgKeyPath2) {
            this.readOrgKey();
          }

          if (path === this.clusterIdPath1 || path === this.clusterIdPath2) {
            this.readClusterId();
          }

          if (path === this.clusterNamePath1 || path === this.clusterNamePath2) {
            this.readClusterName();
          }

          if (path === this.startDelayMaxPath) {
            this.readStartDelaymax();
          }

          if (path === this.configNamespacePath) {
            this.readConfigNamespace();
          }

          if (path === this.validateIntervalPath) {
            this.readValidateInterval();
          }

          if (path === this.pollIntervalPath) {
            this.readPollInterval();
          }

          if (path === this.cleanStartIntervalPath) {
            this.readCleanStartInterval();
          }

          if (path === this.logLevelPath) {
            this.readLogLevel();
          }
        }
        catch(e) {
          // The process will exit to trigger reboot / crashLoopBackoff until the problem resolves
          // eslint-disable-next-line no-console
          console.log( 'An error occurred updating config after an /envs/ file update, process will exit: ', e.message || e );
          // exit after 5s to give log output time to write.
          setTimeout( process.exit, 5000, 1 );
        }
      }
    });
  }
};
