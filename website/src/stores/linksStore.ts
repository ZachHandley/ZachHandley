import { atom } from "nanostores";
import type { Links as LinksDoc } from "~types/appwrite";
import { BaseStore, type ListOptions } from "./baseStore";
import { APPWRITE_DATABASE_ID, COLL_LINKS } from "astro:env/client";

export type LinkItem = LinksDoc & { $id: string };

export class LinksStore extends BaseStore<LinkItem> {
  constructor() {
    super({ databaseId: APPWRITE_DATABASE_ID, tableId: COLL_LINKS, defaultLimit: 50 });
  }

  // Convenience atoms
  selectedIds = atom<string[]>([]);

  // Override list() to use server API instead of client-side SDK
  // The session cookie is httpOnly so client JS cannot read it
  async list(options: ListOptions = {}) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { queries = [], limit, cursor } = options;
      const currentPagination = this.pagination.get();
      const finalLimit = limit ?? currentPagination.limit;

      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "list",
          payload: { queries, limit: finalLimit, cursor },
        }),
      });
      if (!res.ok) throw new Error(`List failed: ${res.status}`);

      const response = await res.json();
      const items = (response.rows ?? []) as unknown as LinkItem[];
      this.items.set(items);

      const lastItem = items[items.length - 1];
      this.pagination.set({
        total: response.total ?? 0,
        limit: finalLimit,
        cursor: lastItem ? lastItem.$id : null,
        hasMore: items.length === finalLimit,
      });

      return { success: true, items, total: response.total ?? 0 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch items";
      this.error.set(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.loading.set(false);
    }
  }

  async createLink(payload: Partial<LinkItem> & { fileId?: string }) {
    // Use admin API so file permissions mirror when fileId is present
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "create", payload }),
    });
    if (!res.ok) throw new Error("Create failed");
    const doc = await res.json();
    // Optimistically add
    const current = this.items.get();
    this.items.set(this.ensureUnique([doc as LinkItem, ...current]));
    return doc as LinkItem;
  }

  async updateLink(id: string, payload: Partial<LinkItem> & { fileId?: string }) {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "update", payload: { id, ...payload } }),
    });
    if (!res.ok) throw new Error("Update failed");
    const doc = await res.json();
    // Merge into items
    const items = this.items.get().map((i) => (i.$id === id ? (doc as LinkItem) : i));
    this.items.set(this.ensureUnique(items));
    return doc as LinkItem;
  }

  async deleteLink(id: string) {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "delete", payload: { id } }),
    });
    if (!res.ok && res.status !== 204) throw new Error("Delete failed");
    const filtered = this.items.get().filter((i) => i.$id !== id);
    this.items.set(filtered);
  }
}

export const linksStore = new LinksStore();
