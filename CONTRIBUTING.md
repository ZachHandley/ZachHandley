# Contributing

Setup, commit style, and PR flow for this repo.

## Setup

```sh
git clone https://github.com/zachhandley/zachhandley.git
cd zachhandley
pnpm install
pnpm dev          # runs the website at http://localhost:3953
```

You need:

- Node 22+ (matches `wrangler.toml` `NODE_VERSION = "22.11.0"`).
- pnpm 10+ (`corepack enable && corepack install`).

## Repo layout

```
.
├── website/         # Astro + Svelte + Threlte SPA, deploys to Cloudflare Workers
├── packages/        # workspace-local libraries (e.g. centerthree)
├── scripts/         # repo-level automation (e.g. featured-projects GH sync)
└── .github/         # GitHub Actions workflows
```

## Commit messages

Short, lowercase, one-liner. No conventional-commits prefixes.

Examples (from the existing log):

```
format pass
rewrite readme: actually current, rust-forward
new ui shell: top bar, social rail, 2d mode toggle
```

## Pull requests

1. Branch from `main`. Name the branch `<short-slug>` (e.g. `ide-shell`).
2. Run `pnpm typecheck && pnpm build` locally — both green.
3. Open the PR against `main`.
4. CI must be green before merge.
5. Squash merge — no merge commits on `main`.

## House rules

These apply to humans and AI agents alike. They are not optional.

- **Never `git stash`** — it loses in-progress work. Use `git diff HEAD`
  or `git show HEAD:<path>` to compare against pre-edit state.
- **Never hand-edit `package.json`** to add/remove/bump a dependency. Use
  `pnpm add <pkg>` / `pnpm remove <pkg>` / `pnpm update <pkg>`. The
  resolver picks the actual current version and updates the lockfile
  atomically.
- **Never hand-edit `.appwrite/appwrite.config.json`.** Edit the YAML
  schemas under `.appwrite/` and push via
  `bunx appwrite-utils-cli appwrite push`.
- **Featured projects are public-GitHub-only.** Anything not public on
  github.com cannot be `featured: true` in the site's Links table.
  Curate via `/admin`. The sync workflow auto-unfeatures private/404
  repos on every run.
- **All checks green before claiming done.** `pnpm typecheck`,
  `pnpm build`. Don't punt failures as "pre-existing" or "out of scope."

## License

By submitting a contribution, you agree that your contribution is
licensed under the same terms as the project (see `LICENSE.md`).
