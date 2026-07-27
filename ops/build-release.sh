#!/usr/bin/env bash
# Build and publish a private self-host release of Habitica.
#
# This is the committed release recipe. Before it existed, the command that
# produced a running production image lived only in a scratch directory, so a
# clean clone could not reproduce what was deployed — the committed Dockerfile
# subscriber features are granted at registration by the upstream self-host
# patch stack, so no build-time unlock flag is involved.
#
# The image tag embeds the FULL 40-character source commit because the GitOps
# promoter requires it (kt-gitops scripts/promote_first_party_image.py: the
# receipt is rejected unless the source commit appears inside the image tag).
#
# Usage:  ops/build-release.sh <selfhost-suffix>      e.g. ops/build-release.sh 8
# Emits:  a publication receipt on stdout for the GitOps promoter.
#
# Secrets: the registry token is read from Azure Key Vault and piped straight
# into `docker login`; it is never echoed, written to disk, or passed in argv.
set -euo pipefail

SUFFIX="${1:?usage: ops/build-release.sh <selfhost-suffix>   (e.g. 8)}"
# Some hosts require sudo for the docker socket; override with DOCKER="sudo -n docker".
DOCKER="${DOCKER:-docker}"
REGISTRY="${HABITICA_REGISTRY:-forgejo.tekeis.net/keistech}"
REGISTRY_HOST="${REGISTRY%%/*}"
BASE_VERSION="$(node -p "require('./package.json').version")"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# --- refuse to build anything unreproducible -------------------------------
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: working tree is dirty. Commit or stash before building a release." >&2
  git status --short >&2
  exit 1
fi

COMMIT="$(git rev-parse HEAD)"
if ! git merge-base --is-ancestor "$COMMIT" "$(git rev-parse HEAD)" 2>/dev/null; then
  echo "ERROR: cannot resolve HEAD." >&2; exit 1
fi

# The commit must exist on a remote, or the published image cannot be rebuilt
# from source by anyone else.
if ! git branch -r --contains "$COMMIT" 2>/dev/null | grep -q . \
   && ! git tag --contains "$COMMIT" 2>/dev/null | grep -q .; then
  echo "ERROR: $COMMIT is not on any remote branch or tag." >&2
  echo "       Push the branch and tag the release before building." >&2
  exit 1
fi

VERSION="${BASE_VERSION}-selfhost.${SUFFIX}"
TAG="${VERSION}-${COMMIT}"          # full SHA in the tag: required by the promoter
BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "[release] version=$VERSION"
echo "[release] commit =$COMMIT"
echo "[release] tag    =$TAG"

# --- registry auth (ephemeral; token never printed) ------------------------
az keyvault secret show --vault-name KT-Homelab --name FORGEJO-CI-TOKEN \
  --query value -o tsv | $DOCKER login "$REGISTRY_HOST" -u ktadmin --password-stdin >/dev/null
trap '$DOCKER logout "$REGISTRY_HOST" >/dev/null 2>&1 || true' EXIT

declare -A DIGESTS
for TARGET in server web; do
  IMAGE="${REGISTRY}/habitica-${TARGET}:${TAG}"
  echo "[release] building $TARGET"
  $DOCKER build --platform linux/amd64 --target "$TARGET" \
    --build-arg VERSION="$VERSION" \
    --build-arg VCS_REF="$COMMIT" \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    -t "$IMAGE" .
  $DOCKER push "$IMAGE"

  # Authenticated REMOTE readback of the exact linux/amd64 index digest.
  # `docker inspect` reads the local store and would not prove what the
  # registry actually serves.
  DIGEST="$($DOCKER buildx imagetools inspect "$IMAGE" \
            | awk '/^Digest:/ {print $2; exit}')"
  [ -n "$DIGEST" ] || { echo "ERROR: no digest returned for $IMAGE" >&2; exit 1; }
  DIGESTS[$TARGET]="$DIGEST"
  echo "[release] $TARGET -> $DIGEST"
done

cat <<EOF

[release] publication receipts (feed to kt-gitops promote_first_party_image.py):
  server: ${REGISTRY}/habitica-server:${TAG}@${DIGESTS[server]}
  web:    ${REGISTRY}/habitica-web:${TAG}@${DIGESTS[web]}
  source_commit: ${COMMIT}
  recorded_at:   ${BUILD_DATE}
EOF
