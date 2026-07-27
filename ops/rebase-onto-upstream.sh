#!/usr/bin/env bash
# Replay our patch stack onto a newer awinterstein self-host release.
#
#   ops/rebase-onto-upstream.sh 5.48.9
#
# Mirrors how awinterstein rebases its own stack onto each upstream release:
# never merge, always replay, and DELETE anything the new base already does.
# See PATCH-STACK.md for what each commit is and when to retire it.
set -euo pipefail

VERSION="${1:?usage: ops/rebase-onto-upstream.sh <version>   e.g. 5.48.9}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

CURRENT="${CURRENT_STACK:-private/selfhost-patches-v5.48.7}"
NEWBASE="selfhost/releases/v${VERSION}"
NEWBRANCH="private/selfhost-patches-v${VERSION}"

if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: working tree is dirty. Commit or stash first." >&2
  git status --short >&2; exit 1
fi

echo "[rebase] fetching awinterstein"
git fetch selfhost --prune --tags >/dev/null 2>&1 || true

if ! git rev-parse --verify "$NEWBASE" >/dev/null 2>&1; then
  echo "ERROR: $NEWBASE does not exist. Available:" >&2
  git branch -r | grep 'selfhost/releases/' | sed 's/.*releases\///' \
    | sort -t. -k1,1n -k2,2n -k3,3n | tail -8 >&2
  exit 1
fi

STACK_BASE="${STACK_BASE:-selfhost/releases/v5.48.7}"
mapfile -t PICKS < <(git rev-list --reverse "${STACK_BASE}..${CURRENT}")

echo "[rebase] $CURRENT has ${#PICKS[@]} commits to replay onto $NEWBASE"
echo
echo "Review each against PATCH-STACK.md before continuing — a commit the new"
echo "base already implements should be DROPPED, not carried:"
for c in "${PICKS[@]}"; do
  printf '  %s  %s\n' "$(git rev-parse --short "$c")" "$(git log -1 --format=%s "$c")"
done
echo
echo "[rebase] checking whether the new base already fixed anything we carry"
for probe in "googleapis.com/css" "onReady(" "hour(dayStart)"; do
  n=$(git grep -c "$probe" "$NEWBASE" -- website/client/src 2>/dev/null | wc -l)
  printf '  %-24s present in new base: %s\n' "$probe" "$n"
done
echo

read -r -p "Proceed and cherry-pick all ${#PICKS[@]}? [y/N] " ans
[ "$ans" = "y" ] || { echo "aborted — cherry-pick the subset you want by hand"; exit 0; }

git checkout -B "$NEWBRANCH" "$NEWBASE"
for c in "${PICKS[@]}"; do
  if git cherry-pick -x "$c"; then
    printf '  OK       %s\n' "$(git log -1 --format=%s | cut -c1-60)"
  else
    echo
    echo "CONFLICT on $(git log -1 --format=%s "$c" | cut -c1-60)"
    echo "Resolve, then: git cherry-pick --continue"
    echo "Or if the new base already does this: git cherry-pick --skip"
    echo "See PATCH-STACK.md#conflicts — registerLoginReset.vue is the usual one."
    exit 1
  fi
done

echo
echo "[rebase] done -> $NEWBRANCH"
echo "Now run the pre-ship checks in PATCH-STACK.md (import resolution, no CDN"
echo "assets, image boots, and the site MOUNTS in a browser) before releasing."
