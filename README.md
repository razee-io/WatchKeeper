# Watch-Keeper

[![Build Status](https://travis-ci.com/razee-io/Watch-keeper.svg?branch=master)](https://travis-ci.com/razee-io/Watch-keeper) [![Greenkeeper badge](https://badges.greenkeeper.io/razee-io/Watch-keeper.svg)](https://greenkeeper.io/)
![GitHub](https://img.shields.io/github/license/razee-io/Watch-keeper.svg?color=success)

Watch-Keeper is a tool that inventories and reports back the resources running on your cluster. Watch-Keeper has been designed to work with [RazeeDash](https://github.com/razee-io/Razeedash), which can display your collected resources.

## Install

1. [Install RazeeDash](https://github.com/razee-io/Razee#step-1-install-razee) or use a hosted razee like [razee.io](https://app.razee.io)
1. Add your org to your razee
1. Go to `https://<razeedash-url>/<your-org-name>/org` then copy and run the `kubectl command` against your new cluster to install the watch-keeper components on your cluster

## Collecting Resources

### Collection Methods:

1. Watches: this is where watch-keeper gets its name. the main idea of watch-keeper is to create watches on resource types with the label `razee/watch-resource=<level>`, and report to razeedash as soon as a change is detected. 
1. Polling: any resource with the `razee/watch-resource=<level>` label will be reported. this is useful for resource that are not watchable.
1. Namespaces: you can gather info from a cluster by labeling a namespace with `razee/watch-resource=<level>`. This will collect and report all data within the labeled namespace at the desired `<level>`.
    
- Ex. `kubectl label cm my-cm razee/watch-resource=lite`

### Collection Levels: 

1. `lite`: reports the `.metadata` and `.status` sections to RazeeDash
1. `detail`: reports the entire resource to RazeeDash, but redacts all environment variables from resources and data values from ConfigMaps/Secrets
1. `debug`: reports the entire resource to RazeeDash, no redaction is done

### Notes

1. `<levels>` must be lower case
1. Be careful labeling namespaces with detail/debug. Thats potentionally a lot of data to be sending up, and can take watch-keeper a long time to send up.
1. Similar long send times can occur when reporting on a namespace with lots of resources (> thousand)

## Reporting Behaviors

Watch-Keeper collects and reports on data in a few different ways. Each of these ways is on a differently timed interval and affects when data populates/updates in RazeeDash. These intervals are configurable via environment variables defined in the deployment yaml (note: Intervals are in minutes and should follow: CLEAN_START_INTERVAL > POLL_INTERVAL > VALIDATE_INTERVAL).

1. Heartbeat: every heartbeat collects the user defined [cluster metadata](#cluster-metadata), the cluster id, and the cluster kube version, and sends the data to RazeeDash.
    - Timing: `1 mintute` (non configurable)
1. Validate Watched Resources:  every `VALIDATE_INTERVAL` minutes, watch keeper will make sure it has a watch created for the resource kinds (ie. apps/v1 Deployment) that have at least one resource instance with the label. This means the first time you add the label to a previously unwatched resource kind, it could take up to `VALIDATE_INTERVAL` minutes to show in razeedash.
    - Timing: `VALIDATE_INTERVAL=10`
1. Poll labeled Resources: every `POLL_INTERVAL` minutes, watch keeper will find all resources with the `razee/watch-resource` label and send to RazeeDash, as well as find all namespaces with the `razee/watch-resource` label and collects/reports all resources within that namespace.
    - Timing: `POLL_INTERVAL=60`
    - coming soon: RazeeDash will have a way to force a re-polling. This will be communicated during the heartbeat, and may take a minute to occur.
1. Clean Start: this is a housekeeping interval. it just clears out all watches, and re-verifies watches it should have. Default is once a day.
    - Timing: `CLEAN_START_INTERVAL=1440`

## Cluster Metadata

You can add extra cluster metadata to send to RazeeDash. This would be used to help differentiate clusters on RazeeDash and be more human readable than a uuid. To do this, all you need is a configmap with the label `razee/cluster-metadata=true`. Specifically, if you define the key `name` in your configmap, RazeeDash will use this in the displays instead of the uuid.

```shell
kubectl create cm my-watch-keeper-cm --from-literal=name=mySpecialDevCluster
kubectl label cm my-watch-keeper-cm razee/cluster-metadata=true
```
