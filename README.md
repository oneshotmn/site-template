# site-template

Structure-only WordPress site template for OneShot client sites. **This
repository holds no logic.** Every real decision — how CI runs, how a preview
deploys, how production is promoted, how Dependabot PRs get merged, how
billing is checked — lives exactly once in
[`oneshotmn/.github`](https://github.com/oneshotmn/.github)'s reusable
`workflow_call` workflows. Every workflow file here is a caller stub under 10
lines that does nothing but `uses:` one of those and pass inputs/secrets.

A client site is never hand-scaffolded. The
[`provision-site.yml`](https://github.com/oneshotmn/.github/blob/main/.github/workflows/provision-site.yml)
reusable workflow in `oneshotmn/.github` takes one input — an organization
name — creates a repo from this template (a template clone, not a fork),
substitutes its tokens, stands up the Fly app, registers the org, and
triggers the first preview build.

## What's here

| Path | What |
| --- | --- |
| `Dockerfile` | WordPress + PHP-FPM + nginx, one multi-arch image, no baked-in secrets. |
| `fly.toml` | Substitutable tokens (`__FLY_APP__`, `__FLY_REGION__`), a volume mount for `wp-content/uploads`. |
| `nginx.conf`, `supervisord.conf`, `entrypoint.sh` | Process wiring. No stack-specific logic beyond running PHP-FPM + nginx. |
| `wp-config.php` | Every value read from an environment variable. No secret is committed. |
| `.oneshot/repo.yml` | Provisioner-owned metadata: `org_slug`, `org_name`, `stack`, `fly_app`, `domain`, `theme_tokens`. |
| `theme/oneshot-block-theme/` | One block theme, bound to [`oneshot-theme`](https://github.com/oneshotmn/oneshot-theme)'s role-token contract. `DESIGN.md` is the only place a colour is named; `theme.json` and CSS reference roles only. |
| `theme/oneshot-block-theme/test/theme-contract.test.mts` | Vendored from `oneshot-theme` — fails `npm test` on a raw hex literal or a retired token name. |
| `test/repo-shape.test.mts` | Fails if any `.github/workflows/*.yml` stub grows a `run:`/`steps:`, or duplicates logic the shared `.github` repo owns. |
| `.github/workflows/*.yml` | Eight caller stubs: `ci`, `preview`, `preview-bootstrap`, `production-deploy`, `automerge`, `deps`, `actions-budget`, `token-health`. |

## No logic here

If you find yourself wanting to add a `run:` step to any workflow in this
repository, or copy a script from `oneshotmn/.github` into this repo instead
of calling it: stop. The fix belongs in `oneshotmn/.github`, not here. This
repository — and every site cloned from it — stays a thin, disposable shell
around shared logic that exists in exactly one place.

## Local checks

```bash
npm ci
npm test        # repo-shape stub check + theme contract + theme-export tests
```
