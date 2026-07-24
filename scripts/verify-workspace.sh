#!/usr/bin/env bash
set -euo pipefail

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app_repo="${workspace_root}/habitica"
wiki_repo="${workspace_root}/habitica-wiki"
fnm_bin="/home/ktadmin/.local/share/fnm/fnm"

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

[[ -d "${app_repo}/.git" ]] || fail "missing application repository"
[[ -d "${wiki_repo}/.git" ]] || fail "missing wiki repository"
[[ -x "${fnm_bin}" ]] || fail "fnm is unavailable at ${fnm_bin}"

origin_url="$(git -C "${app_repo}" remote get-url origin)"
upstream_url="$(git -C "${app_repo}" remote get-url upstream)"
selfhost_url="$(git -C "${app_repo}" remote get-url selfhost)"
upstream_push="$(git -C "${app_repo}" remote get-url --push upstream)"
selfhost_push="$(git -C "${app_repo}" remote get-url --push selfhost)"

[[ "${origin_url}" == *"keislij/habitica.git" ]] || fail "unexpected origin: ${origin_url}"
[[ "${upstream_url}" == "https://github.com/HabitRPG/habitica.git" ]] || fail "unexpected upstream"
[[ "${selfhost_url}" == "https://github.com/awinterstein/habitica.git" ]] || fail "unexpected selfhost"
[[ "${upstream_push}" == "DISABLED" ]] || fail "upstream push is not disabled"
[[ "${selfhost_push}" == "DISABLED" ]] || fail "selfhost push is not disabled"
git -C "${app_repo}" check-ignore -q config.json || fail "config.json is not ignored"
git -C "${app_repo}" submodule status habitica-images | grep -Eq '^ [0-9a-f]{40} ' \
  || fail "habitica-images submodule is not initialized"

node_version="$("${fnm_bin}" exec --using 20 node --version)"
npm_version="$("${fnm_bin}" exec --using 20 npm --version)"
app_version="$("${fnm_bin}" exec --using 20 node -p "require('${app_repo}/package.json').version")"

printf 'OK: Habitica %s, Node %s, npm %s\n' "${app_version}" "${node_version}" "${npm_version}"
printf 'OK: repositories, remotes, push guards, config ignore, and submodule verified\n'

