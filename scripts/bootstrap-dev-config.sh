#!/usr/bin/env bash
set -euo pipefail

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_file="${workspace_root}/habitica/config.json.example"
target_file="${workspace_root}/habitica/config.json"
force="${1:-}"

[[ -f "${source_file}" ]] || {
  printf 'Missing %s\n' "${source_file}" >&2
  exit 1
}

if [[ -e "${target_file}" && "${force}" != "--force" ]]; then
  printf '%s already exists; leaving it unchanged. Use --force to regenerate.\n' "${target_file}"
  exit 0
fi

temporary_file="$(mktemp "${target_file}.tmp.XXXXXX")"
trap 'rm -f "${temporary_file}"' EXIT

jq '
  .ADMIN_EMAIL = "local-dev@example.invalid" |
  .BASE_URL = "http://localhost:3000" |
  .DEBUG_ENABLED = "true" |
  .DISABLE_REQUEST_LOGGING = "false" |
  .EMAIL_SERVER_URL = null |
  .FLAG_REPORT_EMAIL = "local-dev@example.invalid" |
  .GOOGLE_CLIENT_ID = "local-development-only" |
  .GOOGLE_CLIENT_SECRET = "local-development-only" |
  .NODE_DB_URI = "mongodb://localhost:27017/habitica-dev?replicaSet=rs&directConnection=true&readPreference=secondary" |
  .NODE_ENV = "development" |
  .PAYPAL_CLIENT_ID = "local-development-only" |
  .PAYPAL_CLIENT_SECRET = "local-development-only" |
  .PAYPAL_MODE = "sandbox" |
  .RATE_LIMITER_ENABLED = "false" |
  .SESSION_SECRET = "local-development-only" |
  .TEST_DB_URI = "mongodb://localhost:27017/habitica-test?replicaSet=rs&directConnection=true&readPreference=secondary" |
  .TRUSTED_DOMAINS = "localhost,http://localhost:5173"
' "${source_file}" > "${temporary_file}"

chmod 600 "${temporary_file}"
mv "${temporary_file}" "${target_file}"
trap - EXIT
printf 'Created ignored development config at %s\n' "${target_file}"

