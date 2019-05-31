# Watch-Keeper

[![Build Status](https://travis-ci.com/razee-io/Watch-keeper.svg?branch=master)](https://travis-ci.com/razee-io/Watch-keeper) [![Greenkeeper badge](https://badges.greenkeeper.io/razee-io/Watch-keeper.svg)](https://greenkeeper.io/)
![GitHub](https://img.shields.io/github/license/razee-io/Watch-keeper.svg?color=success)

Watch-Keeper is a tool that inventories and reports back the resources running on your cluster. Watch-Keeper has been designed to work with [RazeeDash](https://github.com/razee-io/Razeedash), which can display your collected resources.

## Install

1. [Install RazeeDash](https://github.com/razee-io/Razee#step-1-install-razee) or use a hosted razee like [razee.io](https://app.razee.io)
1. Add your org to your razee
1. Go to `https://<razeedash-url>/<your-org-name>/org` then copy and run the `kubectl command` against your new cluster to install the watch-keeper components on your cluster

## Reporting Behaviors

Watch-Keeper collects and reports on data in a few different ways. Each of these ways is on a differently timed interval and affects when data shows-up/is-updated in RazeeDash.

1. Heartbeat: this occurs once a mintute. every heartbeat collects the user defined [cluster metadata](#cluster-metadata), the cluster id, and the cluster kube version, and sends the data to RazeeDash.

## Cluster Metadata

You can add extra cluster metadata to send to RazeeDash. This would be used to help differentiate clusters on RazeeDash and be more human readable than a uuid. To do this, all you need is a configmap with the label `razee/cluster-metadata=true`. Specifically, if you define the key `name` in your configmap, RazeeDash will use this in the displays instead of the uuid.

```shell
kubectl create cm my-watch-keeper-cm --from-literal=name=mySpecialDevCluster
kubectl label cm my-watch-keeper-cm razee/cluster-metadata=true
```
