# scripts/

One-shot ops scripts. Run from the `website/` directory.

## seed-links.mjs

Pushes the 13 in-code `DEFAULT_LINKS` (snapshot from `src/components/svelte/LinkApp.svelte`) into the Appwrite `links` collection. Idempotent by title — re-running skips rows that already exist.

```bash
# preview without writing
pnpm seed:links -- --dry-run

# create missing rows (no-op for existing)
pnpm seed:links

# delete-and-recreate rows whose title matches a seed entry
pnpm seed:links -- --force
```

Requires `.env` at `website/.env` containing:

```
APPWRITE_ENDPOINT=...
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...        # server API key with databases.write
APPWRITE_DATABASE_ID=main
COLL_LINKS=links
```

The script uses Node 20+'s `--env-file=.env` (no `dotenv` dep).

Each created row gets:

- `permissions`: `read(any)`, `update(label:admin)`, `delete(label:admin)`
- `order`: array index
- `active`: `true`
- name → title, url/icon/type/category passed through (missing fields default to empty string / `"url"`)

After seeding, edit links via `/admin` (LinksManagerView). `DEFAULT_LINKS` in `LinkApp.svelte` remains as the SSR fallback for when the collection is unreachable or empty.
