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
const objectPath = require('object-path');

module.exports = class DataCollector {

  constructor(kc) {
    this.kubeClass = kc;
  }

  async getClusterUid() {
    if (this.clusterID) {
      return this.clusterID;
    }
    let ns = process.env.NAMESPACE || 'kube-system';
    let resourceMeta = {
      uri: `/api/v1/namespaces/${ns}`
    };
    let ks = await this.kubeClass.getResource(resourceMeta);
    this.clusterID = objectPath.get(ks.object, 'metadata.uid');
    return this.clusterID;
  }

  async getKubeVersion() {
    if (this.kubeVersion) {
      return this.kubeVersion;
    }
    let kubeVersion = await this.kubeClass.getResource({ uri: '/version' });
    this.kubeVersion = { kube_version: kubeVersion.object };
    return this.kubeVersion;
  }

  async getClusterMeta() {
    let customMeta = {};
    let cml = await this.kubeClass.getResource({ uri: '/api/v1/configmaps' }, { labelSelector: 'razee/cluster-metadata=true' });
    cml.object.items.map(cm => {
      Object.assign(customMeta, cm.data);
    });

    let kubeVersion = await this.getKubeVersion();
    Object.assign(customMeta, kubeVersion);

    return customMeta;
  }

};
