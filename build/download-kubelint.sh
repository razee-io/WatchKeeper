#!/bin/bash
kubelint() {
  DEPLOYMENT_DIR="${1}"
  KUBELINT_CONFIG="${2}"
  KUBELINT_VERSION="${3}"
  if [[ -z "${DEPLOYMENT_DIR}" ]]; then
    echo "usage: 'kubelint DEPLOYMENT_DIR KUBELINT_CONFIG KUBELINT_VERSION'"
    exit 1
  fi
  [[ -z "${KUBELINT_VERSION}" ]] && KUBELINT_VERSION=latest
  [[ -z "${KUBELINT_CONFIG}" ]] && KUBELINT_CONFIG=kubelint-config.yaml
  mkdir -p "${HOME}/bin"
  curl -sL -o "${HOME}/bin/kube-linter" "https://github.com/stackrox/kube-linter/releases/${KUBELINT_VERSION}/download/kube-linter-linux"
  chmod +x "${HOME}/bin/kube-linter"
  if [[ "$FAIL_ON_INVALID_RESOURCE" = "false" ]]; then
    kube-linter lint -v --fail-if-no-objects-found "${DEPLOYMENT_DIR}" --config "${KUBELINT_CONFIG}"
  else
    kube-linter lint -v --fail-on-invalid-resource --fail-if-no-objects-found "${DEPLOYMENT_DIR}" --config "${KUBELINT_CONFIG}"
  fi
}
mkdir -p "${HOME}/bin"
echo -e "#!/bin/bash\n$(declare -f kubelint)\nkubelint \"\$@\"" > "${HOME}/bin/kubelint"
chmod +x "${HOME}/bin/kubelint"
