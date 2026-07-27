# Downstream patch stack

This fork follows the same model as [`awinterstein/habitica`](https://github.com/awinterstein/habitica):
**never merge, always replay.** Upstream is treated as a moving base, and our
changes are a short ordered stack of single-purpose commits that gets rebased
onto each new release branch.

```
HabitRPG/habitica  v5.48.7          upstream release tag
        │
        └── awinterstein  releases/v5.48.7      23 self-host commits
                    │
                    └── private/selfhost-patches-v5.48.7    7 commits (ours)
```

Two layers, both replayed. We do not carry anything upstream or awinterstein
already does — when they ship an equivalent, our commit is **deleted**, not
merged. Four of our commits died that way in the 5.48.7 rebase:

| Retired | Superseded by |
|---|---|
| unlock group plans | `b8c251f11` + `51718da35` |
| `SELF_HOST_UNLOCK_ALL` plumbing | not needed by their approach |
| gem tile paywall | `cb84443cd` buy gems with gold |
| team cron one-shot | `540b17371` group dailies reset |

## The stack

Ordered bottom to top. Each is independently cherry-pickable.

| # | Commit | Why it exists | Retire when |
|---|---|---|---|
| 1 | `feat(selfhost): hardened production packaging` | Dockerfile, Caddy + CSP, numeric user, dropped capabilities, release recipe. Their Caddy stage ships **no config at all**. | they add a hardened Caddy config |
| 2 | `feat(selfhost): native OIDC login via authentik` | Subject-only, link-gated SSO. No equivalent anywhere upstream. | upstream adds real OIDC |
| 3 | `feat(selfhost): installable PWA for iPad home screens` | manifest + apple meta + icons. | upstream ships a manifest |
| 4 | `fix(selfhost): stop one failed asset from bricking the app` | `onReady` error callback + `vite:preloadError` reload. **Generic bug — send upstream.** | accepted upstream |
| 5 | `fix(selfhost): drop CDN font imports our CSP blocks` | Upstream 5.48.2 `@import` of Google Fonts vs our stricter CSP. | upstream self-hosts the font, or drops it |
| 6 | `fix(selfhost): group chore board blank when plan is granted` | `moment().hour(undefined)` is a getter → throws → render aborts. **Generic bug — send upstream.** | accepted upstream |
| 7 | `polish(selfhost): family chore app rather than a stock install` | Copy, cookie banner, footer. Purely local. | never |

Commits 4 and 6 are real upstream bugs that merely happen to be *triggered* by
our configuration. They are deliberately isolated so they can be submitted
as-is. (Note upstream prohibits AI-generated contributions — a human needs to
own any such submission.)

## Rebasing onto a new release

```bash
git fetch selfhost --prune                       # awinterstein
git checkout -B private/selfhost-patches-vX.Y.Z selfhost/releases/vX.Y.Z
git cherry-pick <c1> <c2> <c3> <c4> <c5> <c6> <c7>
```

Before cherry-picking, check whether each commit is still needed — see the
"Retire when" column. Dropping a commit that upstream has absorbed is the point
of this structure.

### Conflicts

`registerLoginReset.vue` is the usual one: commit 2 adds the SSO button and
commit 7 removes the cookie banner, while awinterstein also edits that file to
strip the social logins. Keep **their** version of the social-login removal and
re-apply only our additions.

## Verify before shipping

The static checks that would have caught the two production incidents in this
stack's history:

```bash
# 1. every relative import under website/server resolves
#    (a missing libs/user/deleteAccount crash-looped the server on boot)
python3 - <<'PY'
import re, pathlib
missing = {f"{p} -> {m.group(1)}"
  for p in pathlib.Path("website/server").rglob("*.js")
  for m in re.finditer(r"""(?:from|require\()\s*['"](\.[^'"]+)['"]""", p.read_text(errors="ignore"))
  if not any(pathlib.Path(str((p.parent/m.group(1)).resolve())+e).exists()
             for e in ("",".js",".json","/index.js"))}
print(f"{len(missing)} unresolved"); [print("  ", x) for x in sorted(missing)]
PY

# 2. no CDN asset our CSP will block
#    (a Google Fonts @import bricked the entire client)
grep -rn "@import url(['\"]\?https\?://" website/client/src --include=*.vue --include=*.scss

cd website/client && npm run build
grep -l googleapis dist/assets/*.css        # must be empty

# 3. the built server image actually boots
sudo -n docker run --rm -e NODE_DB_URI="mongodb://127.0.0.1:27017/x?serverSelectionTimeoutMS=2000" \
  <server-image> 2>&1 | head -40 | grep -c MODULE_NOT_FOUND   # must be 0
```

Then load the site in a browser and confirm it **mounts** — the tab title
becoming `Tasks | Habitica` rather than the static `Habitica - Gamify Your Life`.
`curl` returning 200 proves only that HTML was served; the client hang that
took the site down answered 200 the entire time.

## Release

`ops/build-release.sh <suffix>` — refuses a dirty tree or a commit absent from
every remote, and tags `${VERSION}-${FULL_40_CHAR_SHA}` because kt-gitops'
`promote_first_party_image.py` requires the source commit inside the image tag.
Publish with that promoter; never hand-edit the compose image pins, as the
artifact rows, evidence and rollback entries must move atomically.
