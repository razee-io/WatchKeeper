################################################################################
# Copyright 2019 IBM Corp. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
################################################################################
FROM node:lts-alpine as buildImg

RUN apk update
RUN apk --no-cache add gnupg python make curl

USER node
WORKDIR /home/node

COPY --chown=node . /home/node
RUN npm install --production --loglevel=warn
RUN node -v

#######################################
# Build the production image
FROM node:lts-alpine

USER node
WORKDIR /home/node

COPY --chown=node --from=buildImg /home/node /home/node
CMD ["npm", "start"]
