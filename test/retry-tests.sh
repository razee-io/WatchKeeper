#!/usr/bin/env bash
# Adding retry for tests because they inconsistently fail

KUBECONFIG=./testdata/kubeconfig.yaml

MAX_ATTEMPTS=5
SUCCESS=0
while [ "$MAX_ATTEMPTS" -gt "0" ]; do
    nyc --all --reporter=html --reporter=text mocha --timeout 120000 && SUCCESS=1 && break
    MAX_ATTEMPTS=$((MAX_ATTEMPTS - 1))
    [ "${MAX_ATTEMPTS}" -eq "0" ] && echo "no more attempts" && break
    echo "Retrying, remaining attempts: ${MAX_ATTEMPTS}"
    sleep 5
done
[ "${SUCCESS}" -eq "0" ] && exit 1
exit 0
