#!/usr/bin/env bash
set -euo pipefail

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="${workspace_root}/docs/generated"
output_file="${output_dir}/fandom-pages.tsv"
api_url="https://habitica.fandom.com/api.php"
continue_from=""
temporary_file="$(mktemp)"
trap 'rm -f "${temporary_file}"' EXIT

mkdir -p "${output_dir}"
printf 'page_id\ttitle\n' > "${temporary_file}"

while true; do
  request=(
    --get --fail --silent --show-error
    --data-urlencode "action=query"
    --data-urlencode "list=allpages"
    --data-urlencode "apnamespace=0"
    --data-urlencode "aplimit=max"
    --data-urlencode "format=json"
  )
  if [[ -n "${continue_from}" ]]; then
    request+=(--data-urlencode "apcontinue=${continue_from}")
  fi

  response="$(curl "${request[@]}" "${api_url}")"
  jq -r '.query.allpages[] | [.pageid, .title] | @tsv' <<< "${response}" >> "${temporary_file}"
  continue_from="$(jq -r '.continue.apcontinue // empty' <<< "${response}")"
  [[ -n "${continue_from}" ]] || break
done

mv "${temporary_file}" "${output_file}"
trap - EXIT
printf 'Indexed %s main-namespace Fandom pages in %s\n' \
  "$(( $(wc -l < "${output_file}") - 1 ))" "${output_file}"

