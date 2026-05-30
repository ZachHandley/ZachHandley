import type { APIRoute } from "astro";
import { Databases, Storage, ID, Permission, Role, Query } from "node-appwrite";
import { getAppwriteClient } from "~/server/getAppwriteClient";
import { requireAdmin } from "~/server/auth";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, BUCKET_FILES, APPWRITE_DATABASE_ID, COLL_LINKS } from "astro:env/client";
import { getFileViewUrl } from "appwrite-utils";

type Action = "create" | "update" | "delete" | "list";

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAdmin(cookies);
  if (!auth.ok) return new Response("Forbidden", { status: 403 });

  const { action, payload } = (await request.json()) as {
    action: Action;
    payload: any;
  };
  if (!action) return new Response("Missing action", { status: 400 });

  const client = getAppwriteClient(undefined, undefined, false, true);
  const db = new Databases(client);
  const storage = new Storage(client);

  switch (action) {
    case "create": {
      const data: any = {
        title: payload?.title,
        url: payload?.url ?? null,
        icon: payload?.icon ?? null,
        type: payload?.type ?? "url",
        category: payload?.category ?? null,
        active: payload?.active ?? true,
        order: payload?.order ?? 0,
      };

      // If a fileId is provided, build a public download URL and set type
      if (payload?.fileId) {
        const bucketId = BUCKET_FILES || "files";
        data.type = "download";
        data.url = getFileViewUrl(APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, bucketId, payload.fileId);
      }
      const created = await db.createDocument({
        databaseId: APPWRITE_DATABASE_ID,
        collectionId: COLL_LINKS,
        documentId: ID.unique(),
        data,
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.label("admin")),
          Permission.delete(Role.label("admin")),
        ]
      });
      // If linked file exists and link is public, mirror permissions on file
      if (payload?.fileId && data.active === true) {
        try {
          const bucketId = BUCKET_FILES || "files";
          await storage.updateFile({
            bucketId, fileId: payload.fileId, name: undefined, permissions: [
              Permission.read(Role.any()),
              Permission.update(Role.label("admin")),
              Permission.delete(Role.label("admin")),
            ]
          });
        } catch (e) {
          console.warn("Failed to sync file permissions", e);
        }
      }

      return new Response(JSON.stringify(created), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    case "update": {
      if (!payload?.id) return new Response("Missing id", { status: 400 });
      const updates: any = { ...payload };
      delete updates.id;

      if (payload?.fileId) {
        const bucketId = BUCKET_FILES || "files";
        updates.type = "download";
        updates.url = getFileViewUrl(APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, bucketId, payload.fileId);
      }

      const updated = await db.updateDocument({
        databaseId: APPWRITE_DATABASE_ID,
        collectionId: COLL_LINKS,
        documentId: payload.id,
        data: updates,
      });

      if (payload?.fileId && (payload?.active === true || (updated as any)?.active === true)) {
        try {
          const bucketId = BUCKET_FILES || "files";
          await storage.updateFile({
            bucketId,
            fileId: payload.fileId,
            name: undefined,
            permissions: [
              Permission.read(Role.any()),
              Permission.update(Role.label("admin")),
              Permission.delete(Role.label("admin")),
            ],
          });
        } catch (e) {
          console.warn("Failed to sync file permissions", e);
        }
      }
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    case "delete": {
      if (!payload?.id) return new Response("Missing id", { status: 400 });
      await db.deleteDocument({
        databaseId: APPWRITE_DATABASE_ID,
        collectionId: COLL_LINKS,
        documentId: payload.id,
      });
      return new Response(null, { status: 204 });
    }
    case "list": {
      const queries = payload?.queries ?? [];
      const limit = payload?.limit ?? 50;
      const cursor = payload?.cursor ?? null;

      const finalQueries = [...queries, Query.limit(limit)];
      if (cursor) finalQueries.push(Query.cursorAfter(cursor));

      const response = await db.listDocuments({
        databaseId: APPWRITE_DATABASE_ID,
        collectionId: COLL_LINKS,
        queries: finalQueries,
      });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    default:
      return new Response("Unsupported action", { status: 400 });
  }
};
