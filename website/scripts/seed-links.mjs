#!/usr/bin/env node
// One-shot seed: push the in-code DEFAULT_LINKS into the Appwrite `links` collection.
//
// Run:  node --env-file=.env scripts/seed-links.mjs            (skip existing by title)
//       node --env-file=.env scripts/seed-links.mjs --dry-run  (preview only)
//       node --env-file=.env scripts/seed-links.mjs --force    (delete matching titles first)
//
// Required env vars (already present in .env.example):
//   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
//   APPWRITE_DATABASE_ID, COLL_LINKS

import { Client, TablesDB, ID, Permission, Role, Query } from "node-appwrite";

// Snapshot of DEFAULT_LINKS from src/components/svelte/LinkApp.svelte at the time
// of seeding. Kept here as a one-shot — future edits go through the admin UI.
const DEFAULT_LINKS = [
  {
    name: "GitHub",
    url: "https://github.com/zachhandley",
    icon: "simple-icons:github",
    type: "url",
    category: "personal",
  },
  {
    name: "LinkedIn",
    url: "https://linkedin.com/in/zachhandley",
    icon: "simple-icons:linkedin",
    type: "url",
    category: "personal",
  },
  {
    name: "Resume",
    url: "/files/resume.pdf",
    icon: "mdi:file-pdf-box",
    type: "download",
    category: "downloads",
  },
  {
    name: "Contact",
    url: "/files/contact.vcf",
    icon: "mdi:card-account-details",
    type: "contact",
    category: "downloads",
  },
  {
    name: "Black Leaf",
    url: "https://blackleafdigital.com",
    type: "url",
    category: "professional",
  },
  { name: "Socialaize", url: "https://socialaize.com", type: "url", category: "projects" },
  {
    name: "Instagram",
    icon: "simple-icons:instagram",
    url: "https://instagram.com/zachhandley",
    type: "url",
    category: "personal",
  },
  {
    name: "TikTok",
    icon: "simple-icons:tiktok",
    url: "https://tiktok.com/@zachhandley",
    type: "url",
    category: "personal",
  },
  {
    name: "Cash App",
    icon: "simple-icons:cashapp",
    url: "https://cash.app/$zachhandley",
    type: "url",
    category: "personal",
  },
  {
    name: "Server Hosting",
    url: "https://hetzner.cloud/?ref=qPYPJwLBdFg2",
    type: "url",
    category: "professional",
  },
  { name: "DraxSocial", url: "https://draxsocial.com", type: "url", category: "projects" },
  {
    name: "VibzTalentAgency",
    url: "https://vibztalentagency.com",
    type: "url",
    category: "projects",
  },
  {
    name: "USA Parts & More",
    url: "https://usapartsandmore.com",
    type: "url",
    category: "projects",
  },
];

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const FORCE = args.has("--force");

const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "main";
const TABLE_ID = process.env.COLL_LINKS ?? "links";

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error(
    "Missing required env vars. Need APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY.",
  );
  console.error("Hint: run with `node --env-file=.env scripts/seed-links.mjs`.");
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tablesDB = new TablesDB(client);

console.log(
  `Seed target: ${ENDPOINT}  project=${PROJECT_ID}  db=${DATABASE_ID}  table=${TABLE_ID}`,
);
console.log(
  `Mode: ${DRY_RUN ? "dry-run" : FORCE ? "force (delete + recreate matches)" : "create-if-missing"}`,
);
console.log("");

const existing = await tablesDB.listRows({
  databaseId: DATABASE_ID,
  tableId: TABLE_ID,
  queries: [Query.limit(500)],
});

const existingByTitle = new Map();
for (const row of existing.rows) {
  existingByTitle.set(row.title?.toLowerCase(), row);
}
console.log(`Found ${existing.rows.length} existing row(s).`);
console.log("");

let seeded = 0;
let skipped = 0;
let deleted = 0;
let failed = 0;

for (let i = 0; i < DEFAULT_LINKS.length; i++) {
  const link = DEFAULT_LINKS[i];
  const title = link.name;
  const key = title.toLowerCase();
  const found = existingByTitle.get(key);

  if (found && !FORCE) {
    console.log(`[skip ]  ${title.padEnd(20)}  (already exists, id=${found.$id})`);
    skipped++;
    continue;
  }

  if (found && FORCE) {
    if (DRY_RUN) {
      console.log(`[would delete]  ${title.padEnd(20)}  (id=${found.$id})`);
    } else {
      try {
        await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: TABLE_ID, rowId: found.$id });
        console.log(`[delete]  ${title.padEnd(20)}  (id=${found.$id})`);
        deleted++;
      } catch (err) {
        console.error(`[fail  ]  delete ${title}: ${err.message ?? err}`);
        failed++;
        continue;
      }
    }
  }

  const data = {
    title,
    url: link.url ?? "",
    icon: link.icon ?? "",
    type: link.type ?? "url",
    category: link.category ?? "",
    order: i,
    active: true,
  };

  if (DRY_RUN) {
    console.log(
      `[would create]  ${title.padEnd(20)}  order=${i}  type=${data.type}  category=${data.category || "-"}`,
    );
    continue;
  }

  try {
    const created = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: ID.unique(),
      data,
      permissions: [
        Permission.read(Role.any()),
        Permission.update(Role.label("admin")),
        Permission.delete(Role.label("admin")),
      ],
    });
    console.log(`[create]  ${title.padEnd(20)}  (id=${created.$id})`);
    seeded++;
  } catch (err) {
    console.error(`[fail  ]  create ${title}: ${err.message ?? err}`);
    failed++;
  }
}

console.log("");
console.log(`Summary: created=${seeded}  skipped=${skipped}  deleted=${deleted}  failed=${failed}`);
process.exit(failed > 0 ? 1 : 0);
