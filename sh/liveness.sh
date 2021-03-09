#!/bin/sh
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


HEALTH_FILE=/tmp/liveness

findFile=$(find "${HEALTH_FILE}" -mmin -3 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "FAILING liveness probe. ${HEALTH_FILE} does not exist."
  exit 1
elif [ "${findFile}" = "" ]; then
  echo "FAILING liveness probe. ${HEALTH_FILE} has not been touched in 3 minutes."
  exit 1
else
  # echo "file is good"
  exit 0
fi
