# Source register

Last reviewed: 2026-07-24.

## Authority order

1. Pinned files and code in `habitica/` at the checked-out commit.
2. Official Habitica repository and GitHub wiki.
3. Official API documentation.
4. Official Home Assistant integration documentation/source for HA behavior.
5. Community Fandom wiki for product/operational knowledge.
6. Third-party self-host forks as implementation references only.

## Registered sources

| Source | Local copy | Purpose |
| --- | --- | --- |
| [HabitRPG/habitica](https://github.com/HabitRPG/habitica) | `habitica/`, remote `upstream` | Canonical code, version, license, current toolchain |
| [Official GitHub wiki](https://github.com/HabitRPG/habitica/wiki) | `habitica-wiki/` | Current development and API-use guidance |
| [Habitica API](https://apidoc.habitica.com/) | Live | Endpoint contract |
| [Habitica Fandom wiki](https://habitica.fandom.com/wiki/) | Indexed by script | Broad user/community documentation |
| [Home Assistant Habitica](https://www.home-assistant.io/integrations/habitica/) | Live | Native custom-instance HA contract |
| [awinterstein/habitica](https://github.com/awinterstein/habitica) | remote `selfhost` | Active self-host adaptation reference |

The upstream `habitica-images` submodule is initialized within `habitica/`.

## Known source conflicts

- Fandom's local Docker page describes Node 14/npm 6 and a Compose filename no
  longer present. The current repository requires Node 20/npm 10 and MongoDB 7.
- Upstream describes local development, not a supported production release
  process. Its Compose files are development inputs only.
- The self-host reference changes subscriptions, payments, groups, onboarding,
  analytics, and email behavior. Its patches require line-by-line review and
  current-version tests; the branch is not a turnkey distribution.
- Upstream prohibits AI-generated contributions. Private-fork work must remain
  private and must not be submitted upstream.

Run `scripts/sync-upstreams.sh` to fetch code/wiki refs without merging. Run
`scripts/index-fandom-docs.sh` to refresh the community page-title inventory.

