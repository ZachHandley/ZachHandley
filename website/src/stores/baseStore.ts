import { atom, computed } from "nanostores";
import { useAppwrite } from "~vue/composables/useAppwrite";
import { ID, Query, TablesDB, type Models } from "appwrite";

export interface BaseStoreState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    cursor: string | null;
    hasMore: boolean;
  };
}

export interface BaseStoreConfig {
  databaseId: string;
  tableId: string;
  defaultLimit?: number;
}

export interface ListOptions {
  queries?: string[];
  limit?: number;
  cursor?: string | null;
}

export interface ListAllMatchingOptions {
  queries?: string[];
  chunkSize?: number;
  onProgress?: (loaded: number, total: number | null) => void;
}

export interface CreateOptions {
  documentId?: string;
  permissions?: string[];
}

export interface UpdateOptions {
  permissions?: string[];
}

export class BaseStore<
  T extends Omit<Models.Row, "$databaseId" | "$tableId" | "$permissions" | "$sequence">,
> {
  // State atoms
  public readonly items = atom<T[]>([]);
  // Fast lookup index: Map of $id -> item (derived from items)
  public readonly itemsMap = computed([this.items], (items) => {
    const map = new Map<string, T>();
    for (const it of items) {
      const id = String((it as any).$id || "");
      if (!id) continue;
      if (!map.has(id)) map.set(id, it);
    }
    return map;
  });
  public readonly loading = atom<boolean>(false);
  public readonly error = atom<string | null>(null);
  public readonly pagination = atom({
    total: 0,
    limit: 25,
    cursor: null as string | null,
    hasMore: false,
  });

  // Single item state
  public readonly currentItem = atom<T | null>(null);
  public readonly currentItemLoading = atom<boolean>(false);
  public readonly currentItemError = atom<string | null>(null);

  // Computed states
  public readonly state = computed(
    [this.items, this.loading, this.error, this.pagination],
    (items, loading, error, pagination): BaseStoreState<T> => ({
      items,
      loading,
      error,
      pagination,
    }),
  );

  public readonly hasItems = computed([this.items], (items) => items.length > 0);
  // Reactive, de-duplicated view of items by $id (first occurrence wins)
  public readonly uniqueItems = computed([this.items], (items) => this.ensureUnique(items));
  // O(1) getter using itemsMap
  public readonly getById = computed([this.itemsMap], (map) => (id: string) => map.get(id) || null);

  constructor(private config: BaseStoreConfig) {
    // Set default limit if provided
    if (config.defaultLimit) {
      this.pagination.set({
        ...this.pagination.get(),
        limit: config.defaultLimit,
      });
    }
  }

  // Ensure array has unique items by $id while preserving order (first occurrence wins)
  protected ensureUnique(items: T[]): T[] {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const item of items) {
      const id = String((item as any).$id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push(item);
    }
    return result;
  }

  cleanAppwriteAttributes(thing: any, isUpdate: boolean = true): any {
    // Remove Appwrite specific attributes
    const cleanedObject = { ...thing };
    if (isUpdate) {
      delete cleanedObject.$id;
      delete cleanedObject.$createdAt;
      delete cleanedObject.$updatedAt;
    }
    delete cleanedObject.$permissions;
    delete cleanedObject.$databaseId;
    delete cleanedObject.$tableId;
    return cleanedObject;
  }

  // Get Appwrite client with session waiting and retry logic
  private async getClient(retryCount: number = 0): Promise<any> {
    const { client, tablesDB, isAuthenticated, setSession, waitForReady } = useAppwrite();

    // First, wait for the client to be ready (with a timeout)
    try {
      await waitForReady(2000); // Wait up to 2 seconds
    } catch (error) {
      // Continue anyway, we'll check the session below
    }

    // If not authenticated, try to get session from API
    if (!client || !client.config.session) {
      try {
        const response = await fetch("/api/auth/verify.json", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.authenticated && data.data.session) {
            // Set the session token on the client
            const sessionId = data.data.session.$id || data.data.session;
            setSession(sessionId);

            // Small delay to ensure session is set
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        console.error("Failed to verify session:", error);
      }
    }

    // Check if we have a valid session now
    if (!client || !client.config.session) {
      // If this is our first attempt and we're in a Vue component lifecycle,
      // try waiting a bit and retry
      if (retryCount < 3) {
        const delay = (retryCount + 1) * 500; // 500ms, 1000ms, 1500ms
        console.log(
          `Appwrite client not ready, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.getClient(retryCount + 1);
      }

      throw new Error("User not authenticated");
    }

    if (!tablesDB) {
      throw new Error("TablesDB service not available");
    }

    return tablesDB!; // Non-null assertion since we checked above
  }

  // List documents with queries
  async list(options: ListOptions = {}) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const tablesDB: TablesDB = await this.getClient();
      const { queries = [], limit, cursor } = options;

      // Use provided limit or default from pagination
      const currentPagination = this.pagination.get();
      const finalLimit = limit ?? currentPagination.limit;

      // Build final queries with cursor and limit
      const finalQueries = [...queries];
      finalQueries.push(Query.limit(finalLimit));

      if (cursor) {
        finalQueries.push(Query.cursorAfter(cursor));
      }

      const response = await tablesDB.listRows({
        databaseId: this.config.databaseId,
        tableId: this.config.tableId,
        queries: finalQueries,
      });

      const items = response.rows as unknown as T[];
      this.items.set(this.ensureUnique(items));

      // Update pagination with cursor from last item
      const lastItem = items[items.length - 1];
      this.pagination.set({
        total: response.total,
        limit: finalLimit,
        cursor: lastItem ? lastItem.$id : null,
        hasMore: items.length === finalLimit,
      });

      return {
        success: true,
        items,
        total: response.total,
      };
    } catch (error) {
      console.error(`Failed to list ${this.config.tableId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch items";
      this.error.set(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.loading.set(false);
    }
  }

  // List all matching documents using cursor-based pagination (streaming)
  async *listAllMatching(options: ListAllMatchingOptions = {}) {
    const { queries = [], chunkSize = 100, onProgress } = options;

    // Ensure chunk size is within Appwrite limits
    const finalChunkSize = Math.min(Math.max(1, chunkSize), 1000);

    let lastDocumentId: string | null = null;
    let totalLoaded = 0;
    let estimatedTotal: number | null = null;
    let hasMore = true;

    this.loading.set(true);
    this.error.set(null);

    try {
      const tablesDB = await this.getClient();

      while (hasMore) {
        // Build queries for this chunk
        const chunkQueries = [...queries];

        // Add limit query
        chunkQueries.push(Query.limit(finalChunkSize));

        // Add cursor if we have one (for pagination)
        if (lastDocumentId) {
          chunkQueries.push(Query.cursorAfter(lastDocumentId));
        }

        try {
          const response = await tablesDB.listRows({
            databaseId: this.config.databaseId,
            tableId: this.config.tableId,
            queries: chunkQueries,
          });

          const items = response.rows as unknown as T[];

          // Update our tracking
          totalLoaded += items.length;

          // Determine total count
          if (estimatedTotal === null) {
            // First request - check if we can trust the total
            if (response.total < 5000) {
              // Appwrite's total is reliable under 5000
              estimatedTotal = response.total;
            } else if (items.length === finalChunkSize) {
              // We got a full chunk, there might be many more
              estimatedTotal = null; // Indicates "many"
            } else {
              // We got less than requested, this is the actual total
              estimatedTotal = totalLoaded;
            }
          }

          // Call progress callback if provided
          if (onProgress) {
            onProgress(totalLoaded, estimatedTotal);
          }

          // Yield this chunk of results
          if (items.length > 0) {
            yield items;
          }

          // Check if we should continue
          if (items.length < finalChunkSize) {
            // We got less than requested, we're done
            hasMore = false;
          } else if (items.length === 0) {
            // No more items
            hasMore = false;
          } else {
            // Set up for next iteration
            lastDocumentId = items[items.length - 1].$id;
          }
        } catch (chunkError) {
          console.error(`Failed to fetch chunk for ${this.config.tableId}:`, chunkError);
          // Re-throw to be caught by outer try-catch
          throw chunkError;
        }
      }

      // Final progress update
      if (onProgress && estimatedTotal === null && totalLoaded > 0) {
        // If we never got a reliable total, set it now
        estimatedTotal = totalLoaded;
        onProgress(totalLoaded, estimatedTotal);
      }
    } catch (error) {
      console.error(`Failed to list all matching ${this.config.tableId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch items";
      this.error.set(errorMessage);
      throw error; // Re-throw for the caller to handle
    } finally {
      this.loading.set(false);
    }
  }

  // Get single document
  async get(documentId: string) {
    this.currentItemLoading.set(true);
    this.currentItemError.set(null);

    try {
      const tablesDB = await this.getClient();

      const row = await tablesDB.getRow({
        databaseId: this.config.databaseId,
        tableId: this.config.tableId,
        rowId: documentId,
      });

      const item = row as unknown as T;
      this.currentItem.set(item);

      // CRITICAL FIX: Add the loaded item to the main items array
      // This prevents previously loaded items from being wiped out
      const currentItems = this.items.get();
      const existingIndex = currentItems.findIndex((existingItem) => existingItem.$id === item.$id);

      if (existingIndex >= 0) {
        // Update existing item
        const updatedItems = [...currentItems];
        updatedItems[existingIndex] = item;
        this.items.set(this.ensureUnique(updatedItems));
      } else {
        // Add new item to the front of the array
        this.items.set(this.ensureUnique([item, ...currentItems]));
      }

      return {
        success: true,
        item,
      };
    } catch (error) {
      console.error(`Failed to get ${this.config.tableId} ${documentId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch item";
      this.currentItemError.set(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.currentItemLoading.set(false);
    }
  }

  // Create document
  async create(data: Omit<T, keyof Models.Row>, options: CreateOptions = {}) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const tablesDB = await this.getClient();
      const { documentId, permissions } = options;

      const row = await tablesDB.createRow({
        databaseId: this.config.databaseId,
        tableId: this.config.tableId,
        rowId: documentId || ID.unique(),
        data: this.cleanAppwriteAttributes(data, false),
        permissions,
      });

      const newItem = row as unknown as T;

      // Add to items list
      const currentItems = this.items.get();
      this.items.set(this.ensureUnique([newItem, ...currentItems]));

      // Update pagination total
      const currentPagination = this.pagination.get();
      this.pagination.set({
        ...currentPagination,
        total: currentPagination.total + 1,
      });

      return {
        success: true,
        item: newItem,
      };
    } catch (error) {
      console.error(`Failed to create ${this.config.tableId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create item";
      this.error.set(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.loading.set(false);
    }
  }

  // Update document
  async update(
    documentId: string,
    data: Partial<Omit<T, keyof Models.Row>>,
    options: UpdateOptions = {},
  ) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const tablesDB = await this.getClient();
      const { permissions } = options;

      const row = await tablesDB.updateRow({
        databaseId: this.config.databaseId,
        tableId: this.config.tableId,
        rowId: documentId,
        data: this.cleanAppwriteAttributes(data),
        permissions,
      });

      const updatedItem = row as unknown as T;

      // Validation checkpoint: ensure the update was successful
      if (!updatedItem.$id || updatedItem.$id !== documentId) {
        console.error(`BaseStore - Update validation failed: document ID mismatch`, {
          expected: documentId,
          received: updatedItem.$id,
        });
        throw new Error("Update validation failed: document ID mismatch");
      }

      // Update in items list with validation
      const currentItems = this.items.get();
      const itemIndex = currentItems.findIndex((item) => item.$id === documentId);

      if (itemIndex === -1) {
        console.warn(
          `BaseStore - Item ${documentId} not found in current items during update. Adding to list.`,
        );
        // Add the updated item if it wasn't found (could happen during race conditions)
        this.items.set([...currentItems, updatedItem]);
      } else {
        const updatedItems = currentItems.map((item) =>
          item.$id === documentId ? updatedItem : item,
        );
        this.items.set(updatedItems);
      }

      // Update current item if it matches
      const currentItem = this.currentItem.get();
      if (currentItem?.$id === documentId) {
        this.currentItem.set(updatedItem);
      }

      // Debug logging for store synchronization
      console.log(`BaseStore - Successfully updated ${this.config.tableId} ${documentId}:`, {
        itemsCount: this.items.get().length,
        updatedItemStatus: (updatedItem as any).status,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        item: updatedItem,
      };
    } catch (error) {
      console.error(`Failed to update ${this.config.tableId} ${documentId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update item";
      this.error.set(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.loading.set(false);
    }
  }

  // Upsert document (update if exists, create if not)
  async upsert(documentId: string, data: Omit<T, keyof Models.Row>, options: CreateOptions = {}) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const tablesDB: TablesDB = await this.getClient();
      const { permissions } = options;

      // Try to update first
      try {
        const row = await tablesDB.upsertRow({
          databaseId: this.config.databaseId,
          tableId: this.config.tableId,
          rowId: documentId,
          data: this.cleanAppwriteAttributes(data, false),
          permissions,
        });

        const updatedItem = row as unknown as T;

        // Update in items list
        const currentItems = this.items.get();
        const updatedItems = currentItems.map((item) =>
          item.$id === documentId ? updatedItem : item,
        );
        this.items.set(updatedItems);

        // Update current item if it matches
        const currentItem = this.currentItem.get();
        if (currentItem?.$id === documentId) {
          this.currentItem.set(updatedItem);
        }

        return {
          success: true,
          item: updatedItem,
        };
      } catch (updateError) {
        // If update fails because document doesn't exist, create it
        if (updateError instanceof Error && updateError.message.includes("not found")) {
          const row = await tablesDB.createRow({
            databaseId: this.config.databaseId,
            tableId: this.config.tableId,
            rowId: documentId,
            data: this.cleanAppwriteAttributes(data),
            permissions,
          });

          const newItem = row as unknown as T;

          // Add to items list
          const currentItems = this.items.get();
          this.items.set([newItem, ...currentItems]);

          // Update pagination total
          const currentPagination = this.pagination.get();
          this.pagination.set({
            ...currentPagination,
            total: currentPagination.total + 1,
          });

          return {
            success: true,
            item: newItem,
          };
        }

        // Re-throw if it's a different error
        throw updateError;
      }
    } catch (error) {
      console.error(`Failed to upsert ${this.config.tableId} ${documentId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upsert item";
      this.error.set(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.loading.set(false);
    }
  }

  // Delete document
  async delete(rowId: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const tablesDB: TablesDB = await this.getClient();

      await tablesDB.deleteRow({
        databaseId: this.config.databaseId,
        tableId: this.config.tableId,
        rowId: rowId,
      });

      // Remove from items list
      const currentItems = this.items.get();
      const filteredItems = currentItems.filter((item) => item.$id !== rowId);
      this.items.set(filteredItems);

      // Update pagination total
      const currentPagination = this.pagination.get();
      this.pagination.set({
        ...currentPagination,
        total: Math.max(0, currentPagination.total - 1),
      });

      // Clear current item if it matches
      const currentItem = this.currentItem.get();
      if (currentItem?.$id === rowId) {
        this.currentItem.set(null);
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error(`Failed to delete ${this.config.tableId} ${rowId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete item";
      this.error.set(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.loading.set(false);
    }
  }

  // Clear all state
  clear() {
    this.items.set([]);
    this.currentItem.set(null);
    this.error.set(null);
    this.currentItemError.set(null);
    this.loading.set(false);
    this.currentItemLoading.set(false);
    this.pagination.set({
      total: 0,
      limit: this.config.defaultLimit || 25,
      cursor: null,
      hasMore: false,
    });
  }

  // Refresh current data
  async refresh(options: ListOptions = {}) {
    return this.list(options);
  }

  // -----------------------------
  // Local helpers for realtime and merges
  // -----------------------------
  upsertLocal(item: T) {
    const id = String((item as any).$id || "");
    if (!id) return;
    const current = this.items.get();
    const idx = current.findIndex((x) => x.$id === id);
    if (idx >= 0) {
      const updated = [...current];
      updated[idx] = item;
      this.items.set(this.ensureUnique(updated));
    } else {
      this.items.set(this.ensureUnique([item, ...current]));
    }
  }

  removeLocal(id: string) {
    const current = this.items.get();
    this.items.set(current.filter((x) => x.$id !== id));
  }
}

// Helper to create query strings for common operations
export const QueryHelper = {
  // Equal comparison
  equal: (attribute: string, value: string | string[] | number | boolean) =>
    Query.equal(attribute, value),

  // Not equal
  notEqual: (attribute: string, value: string | number | boolean) =>
    Query.notEqual(attribute, value),

  // Greater than
  greaterThan: (attribute: string, value: string | number) => Query.greaterThan(attribute, value),

  // Less than
  lessThan: (attribute: string, value: string | number) => Query.lessThan(attribute, value),

  // Greater than or equal
  greaterThanEqual: (attribute: string, value: string | number) =>
    Query.greaterThanEqual(attribute, value),

  // Less than or equal
  lessThanEqual: (attribute: string, value: string | number) =>
    Query.lessThanEqual(attribute, value),

  // Search (text search)
  search: (attribute: string, value: string) => Query.search(attribute, value),

  // Contains (text or array contains)
  contains: (attribute: string, value: string | string[]) => Query.contains(attribute, value),

  // Is null
  isNull: (attribute: string) => Query.isNull(attribute),

  // Is not null
  isNotNull: (attribute: string) => Query.isNotNull(attribute),

  // Between values
  between: (attribute: string, start: string | number, end: string | number) =>
    Query.between(attribute, start, end),

  // Starts with
  startsWith: (attribute: string, value: string) => Query.startsWith(attribute, value),

  // Ends with
  endsWith: (attribute: string, value: string) => Query.endsWith(attribute, value),

  // Select specific attributes
  select: (attributes: string[]) => Query.select(attributes),

  // Order by
  orderAsc: (attribute: string) => Query.orderAsc(attribute),

  orderDesc: (attribute: string) => Query.orderDesc(attribute),

  // Limit results
  limit: (count: number) => Query.limit(count),

  // Offset results
  offset: (count: number) => Query.offset(count),

  // Cursor pagination
  cursorAfter: (documentId: string) => Query.cursorAfter(documentId),

  cursorBefore: (documentId: string) => Query.cursorBefore(documentId),
};
