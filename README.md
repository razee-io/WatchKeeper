# Watch-Keeper

[![Build Status](https://travis-ci.com/razee-io/Watch-keeper.svg?branch=master)](https://travis-ci.com/razee-io/Watch-keeper)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=razee-io/Watch-keeper)](https://dependabot.com)
![GitHub](https://img.shields.io/github/license/razee-io/Watch-keeper.svg?color=success)

Watch-Keeper is a tool that inventories and reports back the resources running on
your cluster. Watch-Keeper works with [RazeeDash](https://github.com/razee-io/Razeedash)
to display information about your resources.

## Install

### Via RazeeDash

1. [Install RazeeDash](https://github.com/razee-io/Razee#step-1-install-razee)
or use a hosted razee such as [razee.io](https://app.razee.io).
1. Add your Github org to your razee.
1. Go to `https://<razeedash-url>/<your-org-name>/org` then copy and run the
`kubectl command` against your new cluster to install the watch-keeper components.

### Manually

1. `kubectl create cm watch-keeper-config --from-literal=RAZEEDASH_URL=<path-to-razeedash-api>
 --from-literal=START_DELAY_MAX=0`
    - eg. `kubectl create cm watch-keeper-config --from- literal=RAZEEDASH_URL=http://app.razee.io/api/v2
     --from-literal=START_DELAY_MAX=0`
1. `kubectl create secret generic watch-keeper-secret --from-literal=RAZEEDASH_ORG_KEY=<plain-text-org-api-key-to-auth-with-razeedash>`
    - eg. `kubectl create secret generic watch-keeper-secret --from-literal=RAZEEDASH_ORG_KEY=orgApiKey-88888888-4444-4444-4444-121212121212`
1. `kubectl apply -f https://github.com/razee-io/Watch-keeper/releases/latest/download/resource.yaml`

## Collecting Resources

### Collection Methods

1. Watches: this is where watch-keeper gets its name. Watch-keeper creates watches
on any resource with the label `razee/watch-resource=<level>`, and reports to razeedash
whenever a change occurs.
1. Polling: any resource with the `razee/watch-resource=<level>` label is reported.
This is useful for resources that are not watchable.
1. Namespaces: you can gather info from a cluster by labeling a namespace with
`razee/watch-resource=<level>`. This will collect and report all data within the
labeled namespace at the desired `<level>`. Info is only gathered on the polling
cycle. See [white/black lists](#whiteblack-lists) to limit what is collected.
1. Non-Namespaced Resources: you can gather info about resources that are not bound
to a namespace by adding the key `poll` to the `watch-keeper-non-namespaced` ConfigMap.
Info is only gathered on the polling cycle. See [white/black lists](#whiteblack-lists)
to limit what is collected. See [Non-Namespaced Resources](#non-namespaced-resources)
for more info.
1. Watch by Resource: this allows you to watch and see immediate updates on any
resource kind. This can be useful to watch for changes on non-namespaced resource,
such as nodes or namespaces, without having to label each resource individually.
This can also be useful to watch a single resource type, such as deployments, across
the whole cluster. See [Watch By Resource](#watch-by-resource) for more info.

- Ex. `kubectl label cm my-cm razee/watch-resource=lite`

### Collection Levels

1. `lite`: reports the resource `.metadata` and `.status` (where applicable) sections
to RazeeDash.
1. `detail`: reports the entire resource to RazeeDash, but redacts all environment
variables from resources and data values from ConfigMaps and Secrets.
1. `debug`: reports the entire resource to RazeeDash. All data is reported, including
Secret values.

### Notes

1. `<levels>` must be lower case
1. Labeling namespaces, especially using the detail or debug level collections,
can gather much more data than anticipated resulting in delays in data reporting.
1. Similarly,  delays can occur when reporting on a namespace with lots of resources
(> thousand).

### Watch By Resource

In order to avoid having to label each individual resource, we allow watching by
resource kind. Note: [white/black lists](#whiteblack-lists) do not affect watching.

To watch a resource kind, add it to the `watch-keeper-non-namespaced` ConfigMap
in the form `apiVersion_kind` (where any `/` is replaced with an `_`), with the
value being the [collection levels](#collection-levels) at which you want to watch
at.

Note: When modifying the `watch-keeper-non-namespaced` ConfigMap after the pod
has started, it will take up to `VALIDATE_INTERVAL` minutes (default 10m) to start
watching a resource newly added to the ConfigMap, and up to `CLEAN_START_INTERVAL`
minutes (default 1440m) when changing the collection levels (ie. `lite` to `detail`).
To get watch-keeper to pick up the changes immediately, kill the watch-keeper
pod to force a restart.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: watch-keeper-non-namespaced
  namespace: <watch-keeper ns>
data:
  # 'poll' is optional. Use when you want to poll all non-namespaced resources.
  poll: lite

  # resources to watch
  v1_node: detail
  v1_namespace: lite
  apps_v1_deployment: lite
  v1_configmap: detail
  # ... etc.

```

### Non-Namespaced Resources

In order to avoid having to label each individual non-namespaced resource (eg. nodes,
namespaces, customresourcedefinitions), we allow polling of all non-namespaced resource.
This mechanism is similar to how our namespace resource collection works, where
you can label a namespace and we collect all the resources within that namespace
for you; you can think of this like you are labeling the `non-namespaced-resources`
namespace.

Also similar to how you can label a namespace, there may be resources that you do
not want to collect (eg. storageclass), so you should use [white/black lists](#whiteblack-lists)
to limit what is collected. Note: using the white/black list will affect all resources
polled, namespaced and non-namespace.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: watch-keeper-non-namespaced
  namespace: <watch-keeper ns>
data:
  poll: lite
```

### White/Black Lists

You can white or black list resources by modifying the ConfigMap named
`watch-keeper-limit-poll`, in the namespace your Watch-Keeper is running.

- If both a whitelist and blacklist are specified, only the whitelist will be used.
- The white/black list is employed during the **Polling**, **Namespace** and **Non-Namespaced**
[collection methods](#Collection-Methods). Any individual resource specifically
labeled to be watched will still be watched, regardless of the white/black list.

#### Creating a White/Black List

- To create your white/black list, the ConfigMap will specify the kind of list
you want as the first key, and the rest of the ConfigMap entries become the white/black
list.
- The white/black list itself is created from the ConfigMap keys:
  - The keys will be `apiVersion_kind` (where any `/` is replaced with an `_`).
  - The value must be `'true'`.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: watch-keeper-limit-poll
  namespace: <watch-keeper ns>
data:
  # Type of list (must be 'true')
  whitelist: 'true'

  # Resources affected (must be 'true')
  v1_node: 'true'
  v1_namespace: 'true'
  apps_v1_deployment: 'true'
  v1_configmap: 'true'
  # ... etc.
```

## Feature Intervals

Watch-Keeper collects and reports on data in a few different ways. Each of these
ways is on a differently timed interval and affects when data populates/updates
in RazeeDash. These intervals are configurable via environment variables defined
in the deployment yaml (note: Intervals are in minutes and should follow:
`CLEAN_START_INTERVAL > POLL_INTERVAL > VALIDATE_INTERVAL`. ie. 1440 > 60 > 10).

1. Heartbeat: every heartbeat collects the user defined [cluster metadata](#cluster-metadata),
the cluster id, and the cluster kube version, and sends the data to RazeeDash.
    - Timing: `1 minute` (non configurable)
1. Validate Watched Resources:  every `VALIDATE_INTERVAL` minutes, watch keeper
will make sure it has a watch created for the resource kinds (eg. apps/v1 Deployment)
that have at least one resource instance with the label. This means the first time
you add the label to a previously unwatched resource kind, it could take up to
`VALIDATE_INTERVAL` minutes to show in razeedash.
    - Timing: `VALIDATE_INTERVAL=10`
1. Poll labeled Resources: every `POLL_INTERVAL` minutes, watch keeper will find
all resources with the `razee/watch-resource` label and send to RazeeDash, as well
as find all namespaces with the `razee/watch-resource` label and collects/reports
all resources within those namespaces.
    - Timing: `POLL_INTERVAL=60`
    - coming soon: RazeeDash will have a way to force a re-polling. This will be
    communicated during the heartbeat, and may take a minute to occur.
1. Clean Start: this is a housekeeping interval. It clears out all watches, and
re-verifies watches it should have. Default is once a day.
    - Timing: `CLEAN_START_INTERVAL=1440`

## Cluster Metadata

You can add extra cluster metadata to send to RazeeDash. This can help differentiate
clusters on RazeeDash and be more human readable than a uuid. To do this, add the
label `razee/cluster-metadata=true` to a configmap. If the configmap contains the
key `name`, RazeeDash will display the name instead of the uuid.

```shell
kubectl create cm my-watch-keeper-cm --from-literal=name=mySpecialDevCluster
kubectl label cm my-watch-keeper-cm razee/cluster-metadata=true
```

## Resource Metadata

You can add extra annotations to your resources in order to help the RazeeDash
dashboard link to your change management system.

- Working with github:
  1. `kubectl annotate <resource-kind> <resource-name> "razee.io/git-repo=<github-repo>"`
      - eg. `"razee.io/git-repo=https://github.com/razee-io/Watch-keeper"`
  1. `kubectl annotate <resource-kind> <resource-name> "razee.io/commit-sha=<github-sha>"`
      - eg. `"razee.io/commit-sha=c6645609f8d3b8a48d53246fb7c1f6b60d054aef"`
  1. **Note**: We find it best practice to collect this info and add them to your
  resource yamls at build time instead of doing it manually on your cluster.
- Working with any change management system:
  1. `kubectl annotate <resource-kind> <resource-name> "razee.io/source-url=<fully-qualified-path>"`
      - eg. `"razee.io/source-url=https://github.com/razee-io/Watch-keeper/commit/c6645609f8d3b8a48d53246fb7c1f6b60d054aef"`
  1. **Note**: We find it best practice to collect this info and add them to your
  resource yamls at build time instead of doing it manually on your cluster.
