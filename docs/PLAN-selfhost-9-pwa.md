# Plan: release 5.48.7-selfhost.9 — iPad PWA + login/footer paywall residue

**Author:** Claude · **Date:** 2026-07-26 · **Status:** awaiting adversarial review
**Baseline:** HEAD `3c8d2147a64709518a9b2df8bd2354c05d46ad4b` (== deployed image tag, working tree clean)
**Driver:** Jesse, 2026-07-26: *"You NEED to get the PWA scoped and done tonight for the iPads."*
Also: *"I see google and shit"* on the login page, and *"I don't know how to admin this as a dad."*

---

## 0. Verified ground truth (all checked live, not assumed)

| Fact | Evidence |
|---|---|
| No **install metadata** exists | `website/client/index.html` has no `<link rel="manifest">`, no `apple-*` meta, no `apple-touch-icon`. `website/client/public/` contains only `static/`. (Reviewer note: this is narrower than "no PWA exists" — the app is a working SPA, it simply is not *installable*.) |
| Only two icons exist | `public/static/icons/` = `favicon.ico` (48/192 ico), `favicon_192x192.png`. No 512, no 180. |
| Vector sources available | `website/client/src/assets/svg/habitica-logo.svg`, `logo.svg`, `logo-purple.svg` |
| Prod client = Caddy | `Dockerfile:84` `FROM ${CADDY_IMAGE} AS web`; `COPY .../client/dist /srv`; `ops/Caddyfile` |
| **Caddy file-serves ONLY `/assets/*` and `/static/*`** | `ops/Caddyfile` `@static { path /assets/* /static/* ; file {path} }`; everything else `reverse_proxy` to Node |
| Root paths fall through to the SPA | `curl /manifest.webmanifest` → **`200 text/html; charset=UTF-8`**; same for `/apple-touch-icon.png` |
| `/static/*` serves correct MIME | `curl /static/icons/favicon_192x192.png` → `200 image/png` |
| `nosniff` is set | `ops/Caddyfile` header `X-Content-Type-Options "nosniff"` |
| CSP is `default-src 'self'` | `ops/Caddyfile`. No `manifest-src`/`worker-src` → both inherit `'self'`, so same-origin manifest and SW are permitted. |
| Login page has Google + Apple buttons, unconditionally | `registerLoginReset.vue:42` `proceed('google')`, `:60` `proceed('apple')`; SSO button added at `:24` but the social ones were never removed |
| Footer shows upstream-only links | Rendered in browser: iOS App, Android App, Group Plans, How It Works, Press Kit, Blog, News, Community Guidelines, Hall of Heroes, Contributing, Translate, API v3, Data Display Tool, Guidance for Blacksmiths, Instagram/Bluesky/Facebook/Tumblr |
| Group Billing tab still rendered | `components/group-plans/index.vue` renders `groupPlanBilling` link gated only on `isLeader` |
| Group task board is reachable and unlocked | `taskInformation.vue:318` already gated `if (!this.$unlockAll && !this.group?.purchased?.active)`. Loaded live: title "Keisling Family \| Group Plans", board renders Habits/Dailies/To Do's/Rewards + "Copy tasks". |
| Challenges are NOT broken | `GET /api/v3/challenges/user?page=0` → `{"success":true,"data":[]}`; `db.challenges.countDocuments({})` = **0** |

### Non-goals, explicitly

- **No service worker in this release.** See §2 for the rationale — this is the main scoping decision and the highest-risk thing being deliberately excluded.
- No offline support.
- No change to the group task board's data model or the `assignedUsersDetail` completion scheme.

---

## 1. Why a manifest-only PWA is the correct scope for tonight

iOS **Add to Home Screen does not require a service worker.** Standalone launch on iOS is driven by
`apple-mobile-web-app-capable` (and, on iOS 17+, the manifest's `display: standalone`). A service
worker is only needed for *offline* operation.

Excluding the SW buys the entire user-visible win — a real app icon on each iPad that opens
chrome-less — while avoiding the one failure mode that is genuinely hard to recover from on a
child's device: **a bad service worker persists.** A SW that caches an app shell can pin a stale
build past a deploy, and clearing it on iOS Safari means walking a kid through Settings. There is no
remote kill switch.

So: ship the installable shell tonight; treat offline as a separate change with its own review.

---

## 2. Changes

### 2.1 Icons (new files)

Render from `website/client/src/assets/svg/habitica-logo.svg` (vector → crisp at every size):

| File | Size | Purpose |
|---|---|---|
| `public/static/icons/icon-192.png` | 192×192 | manifest `any` |
| `public/static/icons/icon-512.png` | 512×512 | manifest `any`, iOS splash source |
| `public/static/icons/icon-maskable-512.png` | 512×512 | manifest `maskable`, ~20% safe-area padding |
| `public/static/icons/apple-touch-icon-180.png` | 180×180 | iOS home screen |

Apple touch icons must be **opaque** (iOS composites no background; transparency renders black).
Use the Habitica purple `#4F2A93` as the flat background for the apple icon and the maskable icon.

### 2.2 `public/static/manifest.webmanifest` (new)

```json
{
  "name": "Keisling Chores",
  "short_name": "Chores",
  "description": "Family chores and rewards",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#4F2A93",
  "theme_color": "#4F2A93",
  "icons": [
    { "src": "/static/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/static/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/static/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`start_url: "/"` deliberately — `/` renders the user's task board once authenticated, and lands on
login when not. Note `orientation: "any"` rather than forcing portrait: these are iPads and they get
used both ways.

### 2.3 `website/client/index.html` (edit `<head>`)

```html
<link rel="manifest" href="/static/manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Chores">
<meta name="theme-color" content="#4F2A93">
<link rel="apple-touch-icon" sizes="180x180" href="/static/icons/apple-touch-icon-180.png">
```

An explicit `apple-touch-icon` link is required because iOS otherwise probes `/apple-touch-icon.png`
at the root — which, per §0, returns SPA **HTML** with a 200 and yields a blank icon.

`viewport` already present (`width=device-width, initial-scale=1`) — unchanged. Deliberately **not**
adding `viewport-fit=cover`: with `black-translucent` that would push content under the status bar,
and the app has no safe-area padding.

### 2.4 `ops/Caddyfile` — NO CHANGE (original concern empirically disproven)

The original plan proposed forcing `Content-Type: application/manifest+json`, on the theory that
Caddy's MIME table might not map `.webmanifest` and `nosniff` would then cause iOS to discard it.

**Tested against the exact production Caddy version** (`Dockerfile:5` pins
`caddy:2.10.2-alpine@sha256:4c6e91c6…`) in CT1290, serving a `.webmanifest` three ways —
(a) plain `header @match`, (b) a dedicated `handle` block, (c) **no explicit header at all**:

```
VARIANT CODE         CONTENT-TYPE
a      200 application/manifest+json
b      200 application/manifest+json
c      200 application/manifest+json      <-- native, no config needed
```

Caddy 2.10.2 already knows the type. **So the Caddyfile is not modified in this release** — the
production reverse proxy config is untouched, which is a strictly smaller blast radius. The
`curl -I` MIME assertion in §5 stays, as a regression check rather than a fix verification.

### 2.5 Login page — drop Google/Apple (`registerLoginReset.vue`)

Wrap the two social blocks (lines ~38-71) in `v-if="!$unlockAll"`. Neither provider has credentials
configured on this instance, so both buttons are guaranteed-dead UI on the first screen a family
member sees. Local username/password and the Keistech SSO button are untouched.

Guarding rather than deleting, consistent with the `subscription` route decision in `.7` — upstream
merges stay clean and the diff stays reviewable.

### 2.6 Footer — hide upstream-only links (`appFooter.vue`)

Gate on `!$unlockAll`: the Product / Company / Community / Support / Developers columns and the
Social column. Keep Privacy/Terms.

Rationale: every one of these either leaves the instance, advertises apps the family cannot use, or
files bugs against upstream Habitica for a fork upstream does not ship.

**Attribution (required — reviewer finding).** The existing `© 2026 Habitica. All rights reserved.`
line is **not** sufficient CC-BY-SA attribution, and it is also simply wrong for a GPLv3 project.
Habitica's code is GPLv3 and its art/content is CC-BY-SA 4.0, so removing the surrounding links
without fixing this would leave the instance under-attributed. Replace that line, shown
unconditionally (not gated), with:

> Powered by [Habitica](https://habitica.com) — code [GPLv3](https://github.com/HabitRPG/habitica/blob/develop/LICENSE),
> art and content [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). © HabitRPG, Inc.

This is strictly *better* attribution than what ships today, and it is the only footer element that
must survive the gate.

### 2.7 Group Billing tab (`components/group-plans/index.vue`)

Change `v-if="isLeader"` → `v-if="isLeader && !$unlockAll"` on the `groupPlanBilling` link. There is
no billing on a self-host, and it is currently one click from the chore board.

---

## 3. Deliberately deferred (with reasons, not dropped)

| Item | Why not now |
|---|---|
| Service worker / offline | §1. Needs its own review; irreversible-ish on iOS. |
| Challenges empty state | Challenges are **not** the chore mechanism (party task board is) and the API is healthy. Cosmetic. |
| **Group task board wedges the renderer** | Reproduced in 2/2 fresh tabs: `get_page_text` succeeds, `Page.captureScreenshot` times out ⇒ script keeps the main thread busy. Suspect the unconditional `bv::show::modal 'group-plans-update'` tour modal at `taskInformation.vue:332` (`user.flags.tour.groupPlans !== -2`). Needs a separate diagnosis; **do not blind-fix**. |
| Remaining cosmetic gates | `randomDrop.js:73` drop cap, `buyModal.vue`, `timeTravelers`, `chat.js`, `hall.js` — none block chore use. |

---

## 4. Build & deploy

Use the existing `ops/build-release.sh` (refuses a dirty tree or a commit absent from all remotes;
tag = `${VERSION}-${FULL_SHA}` to satisfy `promote_first_party_image.py`'s full-40-char rule).

1. Commit on a branch off `private/selfhost-production-v5.48.7`; push to Forgejo **before** building.
2. `VERSION=5.48.7-selfhost.9 ops/build-release.sh` → build + push `habitica-server` and `habitica-web`.
3. Update both image refs + digests in `kt-gitops/stacks/habitica/habitica/compose.yaml`.
4. `fleet_check_stack.sh habitica habitica` then `deploy_one.sh habitica habitica`.

## 5. Verification (must all be evidence-backed; visual QA is mandatory per standing rule)

1. `curl -I https://chores.tekeis.net/static/manifest.webmanifest` → `200` **and** `content-type: application/manifest+json`.
2. `curl -o /dev/null -w '%{http_code} %{content_type}'` on all four icon paths → `200 image/png`.
3. `curl -s https://chores.tekeis.net/ | grep -E 'rel="manifest"|apple-mobile-web-app-capable|apple-touch-icon'` → all present in served HTML.
4. **Browser, logged out**: screenshot `/login`; assert **no** Google/Apple buttons, Keistech SSO present. (Must use a session-free context — `/login` redirects away when a session cookie exists, which is exactly how the Google buttons were missed the first time.)
5. **Browser, logged in**: screenshot footer; assert upstream columns gone.
6. Screenshot group task board; assert no "Group Billing" tab.
7. Re-run both HA automations' traces to confirm nothing regressed.
8. **On an actual iPad** — Add to Home Screen, confirm the icon is the Habitica gryphon (not a blank/white tile or a page screenshot) and that launching it opens chrome-less. This one cannot be done remotely: mark **needs user verification**.

## 6. Rollback

Single step: revert the two image refs+digests in `compose.yaml` to the `.8` tag
(`...-3c8d2147a64709518a9b2df8bd2354c05d46ad4b`) and re-run `deploy_one.sh`. No DB migration, no
schema change, no service worker ⇒ nothing persists on a client that a reload cannot undo.
