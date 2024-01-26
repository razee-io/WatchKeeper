/**
 * Copyright 2024 IBM Corp. All Rights Reserved.
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
const { KubeClass } = require('@razee/kubernetes-util');
const kc = new KubeClass();

module.exports = class Util {
  // Read from razee-identity secret dynamically (rather than mounting as a volume and reading from a file) to satisfy scenarios where this operator is run on a separate cluster
  static async getOrgKey() {
    const krm = await kc.getKubeResourceMeta('v1', 'Secret', 'get');
    const res = await krm.request({ uri: '/api/v1/namespaces/razeedeploy/secrets/razee-identity', json: true });
    let base64KeyData = objectPath.get(res, ['data', 'RAZEE_ORG_KEY']);
    if (base64KeyData === undefined) {
      throw new Error('razeedeploy/razee-identity secret does not contain RAZEE_ORG_KEY');
    }
    let secret = Buffer.from(base64KeyData, 'base64');
    return secret.toString();
  }
};
