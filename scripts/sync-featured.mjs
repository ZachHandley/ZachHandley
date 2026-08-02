#!/usr/bin/env node
// Sync featured projects: read featured rows from Appwrite, enrich with
// live GitHub metadata, write back. README marker regions are regenerated
// from the resulting featured list.
//
// Curation lives in Appwrite (/admin). This script never decides what's
// featured — it only fills in description / icon / stack from GitHub and
// auto-unfeatures repos that have become private/404/archived.
//
// Env:
//   APPWRITE_API_KEY      the only real secret. Required to WRITE rows; without
//                         it the script runs read-only (README still regenerates,
//                         Appwrite rows are left alone) rather than failing.
//   APPWRITE_ENDPOINT     public, defaults to the value in website/src/env.ts
//   APPWRITE_PROJECT_ID   public, defaults to the value in website/src/env.ts
//   APPWRITE_DATABASE_ID  (default "main")
//   APPWRITE_TABLE_ID     (default "links")
//   GITHUB_TOKEN          (provided automatically in Actions)
//   GITHUB_STEP_SUMMARY   (provided automatically in Actions)
//
// Usage:
//   node scripts/sync-featured.mjs               (writes Appwrite + README)
//   node scripts/sync-featured.mjs --dry-run     (no writes; logs the plan)

import { Octokit } from "@octokit/rest";
import { Client, TablesDB, Query } from "node-appwrite";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { appendFile } from "node:fs/promises";

const DRY_RUN = process.argv.includes("--dry-run");

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const README_PATH = join(REPO_ROOT, "README.md");

const RUST_MARKER_START = "<!-- featured:rust:start -->";
const RUST_MARKER_END = "<!-- featured:rust:end -->";
const TS_MARKER_START = "<!-- featured:typescript:start -->";
const TS_MARKER_END = "<!-- featured:typescript:end -->";

const ICON_BY_LANG = {
  rust: "simple-icons:rust",
  typescript: "simple-icons:typescript",
  javascript: "simple-icons:javascript",
  go: "simple-icons:go",
  python: "simple-icons:python",
  svelte: "simple-icons:svelte",
  astro: "simple-icons:astro",
  vue: "simple-icons:vuedotjs",
  csharp: "simple-icons:dotnet",
  shell: "simple-icons:gnubash",
};

// Topics we accept as stack chips. Anything else is dropped — repo topics
// often include noise like "awesome" / "library" / "tool" that adds nothing
// to a stack chip.
const STACK_TOPIC_WHITELIST = new Set([
  "rust",
  "typescript",
  "javascript",
  "python",
  "go",
  "astro",
  "svelte",
  "vue",
  "react",
  "nextjs",
  "tailwindcss",
  "appwrite",
  "supabase",
  "postgres",
  "sqlite",
  "wasm",
  "mcp",
  "ai",
  "llm",
  "cli",
  "tauri",
  "cloudflare",
  "cloudflare-workers",
  "ffmpeg",
  "nfs",
  "vector-search",
  "hnsw",
  "embeddings",
]);

function iconFor(language) {
  if (!language) return "simple-icons:github";
  return ICON_BY_LANG[language.toLowerCase()] ?? "simple-icons:github";
}

function stackFor(language, topics) {
  const out = new Set();
  if (language) out.add(language);
  for (const t of topics ?? []) {
    if (STACK_TOPIC_WHITELIST.has(t.toLowerCase())) {
      out.add(t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  }
  return [...out].slice(0, 3);
}

function parseGithubRepoUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/?#]+)/i);
  if (!m) return null;
  return { owner: m[1], name: m[2].replace(/\.git$/, "") };
}

function arrEq(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function main() {
  // Endpoint and project id are public — they ship to the browser and already
  // carry these exact defaults in website/src/env.ts. Requiring them as Actions
  // secrets is what killed every scheduled run since this workflow was added:
  // the loop below threw `Missing required env var: APPWRITE_ENDPOINT` before
  // reaching the one value that is actually secret.
  const {
    APPWRITE_ENDPOINT = "https://appwrite.blackleafdigital.com/v1",
    APPWRITE_PROJECT_ID = "68c3bb35001fe37018e4",
    APPWRITE_API_KEY,
    APPWRITE_DATABASE_ID = "main",
    APPWRITE_TABLE_ID = "links",
    GITHUB_TOKEN,
  } = process.env;

  // The key IS required to write: this script pushes GitHub metadata back into
  // the rows via updateRow. But `links` is world-readable, so without a key we
  // can still read it and regenerate the README. Degrade to a dry run instead of
  // failing the job outright — a stale README block is worse than a partial sync.
  const readOnly = !APPWRITE_API_KEY;
  if (readOnly) {
    console.warn(
      "APPWRITE_API_KEY is not set - running read-only. The README will still be " +
        "regenerated; Appwrite rows will not be updated.",
    );
  }

  const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
  // Never call setKey with a falsy value: Appwrite rejects an invalid key with
  // 401 instead of falling back to guest scope, which would break the read too.
  if (APPWRITE_API_KEY) client.setKey(APPWRITE_API_KEY);
  const db = new TablesDB(client);
  const octokit = new Octokit({ auth: GITHUB_TOKEN || undefined });

  const summary = [];
  const featuredAfter = [];

  // 1. Query featured rows from Appwrite.
  const res = await db.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_TABLE_ID,
    queries: [Query.equal("featured", true), Query.orderAsc("order"), Query.limit(100)],
  });
  const rows = res.rows;
  console.log(`Found ${rows.length} featured rows in Appwrite`);

  for (const row of rows) {
    const parsed = parseGithubRepoUrl(row.repoUrl);
    if (!parsed) {
      summary.push({
        title: row.title,
        action: "skipped",
        reason: "no github.com repoUrl",
      });
      // Featured but no GH repoUrl → still goes into README under its language
      // group, but we have nothing to enrich.
      featuredAfter.push(row);
      continue;
    }

    let repo;
    try {
      const r = await octokit.repos.get({ owner: parsed.owner, repo: parsed.name });
      repo = r.data;
    } catch (e) {
      const status = e?.status ?? "?";
      if (status === 404 || status === 403 || status === 451) {
        // Private / gone / blocked → unfeature.
        if (!DRY_RUN && !readOnly) {
          await db.updateRow({
            databaseId: APPWRITE_DATABASE_ID,
            tableId: APPWRITE_TABLE_ID,
            rowId: row.$id,
            data: { featured: false },
          });
        }
        summary.push({
          title: row.title,
          action: "unfeatured",
          reason: `github returned ${status}`,
        });
        continue;
      }
      throw e;
    }

    if (repo.archived || repo.private) {
      if (!DRY_RUN && !readOnly) {
        await db.updateRow({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: APPWRITE_TABLE_ID,
          rowId: row.$id,
          data: { featured: false },
        });
      }
      summary.push({
        title: row.title,
        action: "unfeatured",
        reason: repo.archived ? "archived" : "private",
      });
      continue;
    }

    const next = {};
    const newIcon = iconFor(repo.language);
    const newStack = stackFor(repo.language, repo.topics);
    const newDescription = repo.description ?? null;

    if (!row.title || row.title.trim() === "") next.title = repo.name;
    if (newIcon && row.icon !== newIcon) next.icon = newIcon;
    if (!arrEq(row.stack ?? [], newStack)) next.stack = newStack;
    if (!row.descriptionLocked && newDescription && row.description !== newDescription) {
      next.description = newDescription;
    }

    let action = "unchanged";
    if (Object.keys(next).length > 0) {
      if (!DRY_RUN && !readOnly) {
        await db.updateRow({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: APPWRITE_TABLE_ID,
          rowId: row.$id,
          data: next,
        });
      }
      action = "updated";
    }
    summary.push({
      title: row.title || repo.name,
      action,
      language: repo.language,
      stars: repo.stargazers_count,
      changed: Object.keys(next),
    });
    featuredAfter.push({
      ...row,
      ...next,
      // Keep these in memory for the README render even if Appwrite write was skipped.
      _ghLanguage: repo.language,
      _ghHtmlUrl: repo.html_url,
      _ghStars: repo.stargazers_count,
    });
  }

  // 2. Regenerate README marker regions.
  const readme = await readFile(README_PATH, "utf8");
  const byLang = (lang) =>
    featuredAfter.filter((r) => {
      const language = (r._ghLanguage ?? "").toLowerCase();
      return language === lang.toLowerCase();
    });

  const renderRow = (r) => {
    const url = r.url || r._ghHtmlUrl;
    const repoUrl = r.repoUrl || r._ghHtmlUrl;
    const showsRepoToo = url && repoUrl && url !== repoUrl;
    const stars = r._ghStars ?? 0;
    const starsTag = stars >= 5 ? ` ⭐${stars}` : "";
    const desc = r.description ? ` — ${r.description.replace(/\.$/, "")}.` : "";
    const repoSuffix = showsRepoToo ? ` ([repo](${repoUrl}))` : "";
    return `- **[${r.title}](${url})**${starsTag}${repoSuffix}${desc}`;
  };

  const rustBlock = byLang("Rust").map(renderRow).join("\n");
  const tsBlock = byLang("TypeScript").map(renderRow).join("\n");

  const replaceBlock = (src, start, end, body) => {
    const s = src.indexOf(start);
    const e = src.indexOf(end);
    if (s === -1 || e === -1) {
      console.warn(`README missing markers ${start} / ${end} — skipping that block`);
      return src;
    }
    const before = src.slice(0, s + start.length);
    const after = src.slice(e);
    return `${before}\n${body}\n${after}`;
  };

  let nextReadme = replaceBlock(readme, RUST_MARKER_START, RUST_MARKER_END, rustBlock);
  nextReadme = replaceBlock(nextReadme, TS_MARKER_START, TS_MARKER_END, tsBlock);

  const readmeChanged = nextReadme !== readme;
  if (readmeChanged && !DRY_RUN) {
    await writeFile(README_PATH, nextReadme, "utf8");
  }

  // 3. Job summary.
  const md = [];
  md.push("## Featured sync summary\n");
  if (DRY_RUN) md.push("**Dry run** — no writes performed.\n");
  if (readOnly)
    md.push("**Read-only** — APPWRITE_API_KEY is not set, so Appwrite rows were not updated.\n");
  md.push(`| Title | Action | Notes |\n| --- | --- | --- |`);
  for (const s of summary) {
    const notes = s.reason
      ? s.reason
      : s.changed && s.changed.length > 0
        ? `changed: ${s.changed.join(", ")}`
        : `${s.language ?? "?"} · ${s.stars ?? 0}★`;
    md.push(`| ${s.title} | ${s.action} | ${notes} |`);
  }
  md.push("");
  md.push(`README changed: ${readmeChanged ? "yes" : "no"}`);
  const mdText = md.join("\n");

  console.log(mdText);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${mdText}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
