#!/usr/bin/env bash
set -euo pipefail

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

git -C "${workspace_root}/habitica" fetch --prune origin
git -C "${workspace_root}/habitica" fetch --prune upstream
git -C "${workspace_root}/habitica" fetch --prune selfhost
git -C "${workspace_root}/habitica-wiki" fetch --prune origin

printf 'Fetched all registered remotes. No branches were merged, rebased, or checked out.\n'

