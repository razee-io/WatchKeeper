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

  static async getRazeedashUrl() {
    if (await fs.pathExists(this.razeedashUrlPath1)) {
      return (await fs.readFile(this.razeedashUrlPath1, 'utf8')).trim();
    } else if (await fs.pathExists(this.razeedashUrlPath2)) {
      let razeeApi = (await fs.readFile(this.razeedashUrlPath2, 'utf8')).trim();
      return `${razeeApi.replace(/\/+$/, '')}/api/v2`;
    }
    return '';
  }

  static async getOrgKey() {
    if (await fs.pathExists(this.orgKeyPath1)) {
      return (await fs.readFile(this.orgKeyPath1, 'utf8')).trim();
    } else if (await fs.pathExists(this.orgKeyPath2)) {
      return (await fs.readFile(this.orgKeyPath2, 'utf8')).trim();
    }
    return '';
  }

  static async getClusterId() {
    if (await fs.pathExists(this.clusterIdPath1)) {
      return (await fs.readFile(this.clusterIdPath1, 'utf8')).trim();
    } else if (await fs.pathExists(this.clusterIdPath2)) {
      return (await fs.readFile(this.clusterIdPath2, 'utf8')).trim();
    }
    return '';
  }

  static async getClusterName() {
    if (await fs.pathExists(this.clusterNamePath1)) {
      return (await fs.readFile(this.clusterNamePath1, 'utf8')).trim();
    } else if (await fs.pathExists(this.clusterNamePath2)) {
      return (await fs.readFile(this.clusterNamePath2, 'utf8')).trim();
    }
    return '';
  }

  static async getStartDelaymax() {
    if (await fs.pathExists(this.startDelayMaxPath)) {
      return (await fs.readFile(this.startDelayMaxPath, 'utf8')).trim();
    }
    return '';
  }

  static async getConfigNamespace() {
    if (await fs.pathExists(this.configNamespacePath)) {
      return (await fs.readFile(this.configNamespacePath, 'utf8')).trim();
    }
    return '';
  }

  static async getValidateInterval() {
    if (await fs.pathExists(this.validateIntervalPath)) {
      return (await fs.readFile(this.validateIntervalPath, 'utf8')).trim();
    }
    return '';
  }

  static async getPollInterval() {
    if (await fs.pathExists(this.pollIntervalPath)) {
      return (await fs.readFile(this.pollIntervalPath, 'utf8')).trim();
    }
    return '';
  }

  static async getCleanStartInterval() {
    if (await fs.pathExists(this.cleanStartIntervalPath)) {
      return (await fs.readFile(this.cleanStartIntervalPath, 'utf8')).trim();
    }
    return '';
  }

  static async getLogLevel() {
    if (await fs.pathExists(this.logLevelPath)) {
      return (await fs.readFile(this.logLevelPath, 'utf8')).trim();
    }
    return '';
  }
};
