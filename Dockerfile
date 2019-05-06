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
FROM node:alpine as buildImg

RUN apk update
RUN apk --no-cache add gnupg python make curl

RUN mkdir -p /usr/src/app
ENV PATH="$PATH:/usr/src/app"
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN npm install --production --loglevel=warn


FROM node:alpine
RUN apk add --upgrade --no-cache libssl1.1
RUN mkdir -p /usr/src/app
ENV PATH="$PATH:/usr/src/app"
WORKDIR /usr/src/app
COPY --from=buildImg /usr/src/app /usr/src/app
CMD ["npm", "start"]
