import { TablesDB, Storage, Query, ID, Permission, Role } from "node-appwrite";
import { getAppwriteClient } from "~/server/getAppwriteClient";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, BUCKET_FILES, COLL_LINKS } from "astro:env/client";
import { getFileViewUrl } from "appwrite-utils";
import { type Links } from "~/types/appwrite.d";

export class AppwriteServer {
  private tablesDB: TablesDB;
  private storage: Storage;

  constructor() {
    const client = getAppwriteClient(undefined, undefined, false, true);
    this.tablesDB = new TablesDB(client);
    this.storage = new Storage(client);
  }

  private fileUrl(fileId: string): string {
    const bucketId = BUCKET_FILES || "files";
    return getFileViewUrl(APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, bucketId, fileId);
  }

  async listPublished(): Promise<Links[]> {
    const res = await this.tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: COLL_LINKS,
      queries: [
        Query.equal("active", true),
        Query.orderAsc("order"),
        Query.limit(200),
      ]
    });
    return res.rows as unknown as Links[];
  }

  async listAll(): Promise<Links[]> {
    const res = await this.tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID, tableId: COLL_LINKS, queries: [
        Query.orderAsc("order"),
        Query.limit(500),
      ]
    });
    return res.rows as unknown as Links[];
  }

  async createLink(payload: Partial<Links> & { fileId?: string }) {
    const data: any = {
      title: payload.title,
      url: payload.url ?? null,
      icon: payload.icon ?? null,
      type: payload.type ?? "url",
      category: payload.category ?? null,
      active: payload.active ?? true,
      order: payload.order ?? 0,
    };
    if (payload.fileId) {
      data.type = "download";
      data.url = this.fileUrl(payload.fileId);
    }
    const created = await this.tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: COLL_LINKS,
      rowId: ID.unique(),
      data,
      permissions: [
        ...(data.active === true ? [Permission.read(Role.any())] : []),
        Permission.update(Role.label("admin")),
        Permission.delete(Role.label("admin")),
      ]
    });

    if (payload.fileId && data.active === true) {
      const bucketId = BUCKET_FILES || "files";
      await this.storage.updateFile({
        bucketId: bucketId, fileId: payload.fileId, name: undefined, permissions: [
          ...(data.active === true ? [Permission.read(Role.any())] : []),
          Permission.update(Role.label("admin")),
          Permission.delete(Role.label("admin")),
        ]
      });
    }
    return created;
  }

  async updateLink(id: string, updates: Partial<Links> & { fileId?: string }) {
    const data: any = { ...updates };
    delete data.$id;
    delete data.$createdAt;
    delete data.$updatedAt;
    if (updates.fileId) {
      data.type = "download";
      data.url = this.fileUrl(updates.fileId);
    }
    const updated = await this.tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: COLL_LINKS,
      rowId: id,
      data,
      permissions: [
        ...(data.active === true ? [Permission.read(Role.any())] : []),
        Permission.update(Role.label("admin")),
        Permission.delete(Role.label("admin")),
      ]
    });

    if (updates.fileId && (updates.active === true || (updated as any)?.active === true)) {
      const bucketId = BUCKET_FILES || "files";
      await this.storage.updateFile({
        bucketId,
        fileId: updates.fileId,
        permissions: [
          ...(data.active === true ? [Permission.read(Role.any())] : []),
          Permission.update(Role.label("admin")),
          Permission.delete(Role.label("admin")),
        ]
      });
    }
    return updated;
  }

  async deleteLink(id: string) {
    return this.tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: COLL_LINKS, rowId: id });
  }
}

export default AppwriteServer;
