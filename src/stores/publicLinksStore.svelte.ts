import { Client, TablesDB, Query, Realtime, type RealtimeSubscription } from "appwrite";
import {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID,
  COLL_LINKS,
} from "astro:env/client";
import type { Link } from "~/types/baseSchemas";

function rowsToLinks(rows: Array<Record<string, unknown>>): Link[] {
  return rows.map((doc) => ({
    name: doc.title as string,
    url: (doc.url as string | undefined) ?? undefined,
    icon: (doc.icon as string | undefined) ?? undefined,
    type: ((doc.type as string | undefined) ?? "url") as Link["type"],
    category: (doc.category as string | undefined) ?? undefined,
    active: doc.active as boolean,
    order: doc.order as number,
    featured: (doc.featured as boolean | undefined) ?? false,
    stack: (doc.stack as string[] | undefined) ?? undefined,
    repoUrl: (doc.repoUrl as string | undefined) ?? undefined,
    description: (doc.description as string | undefined) ?? undefined,
  }));
}

class PublicLinksStore {
  links = $state<Link[]>([]);
  hydrated = $state(false);

  #subscriberCount = 0;
  #subscription: RealtimeSubscription | null = null;
  #realtime: Realtime | null = null;
  #tablesDB: TablesDB | null = null;

  init(seed: Link[]): void {
    if (this.hydrated) return;
    this.links = seed;
    this.hydrated = true;
  }

  async start(): Promise<() => Promise<void>> {
    this.#subscriberCount += 1;
    if (this.#subscriberCount === 1) {
      const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
      this.#tablesDB = new TablesDB(client);
      this.#realtime = new Realtime(client);
      const channel = `databases.${APPWRITE_DATABASE_ID}.tables.${COLL_LINKS}.rows`;
      this.#subscription = await this.#realtime.subscribe(channel, () => {
        this.refetch().catch(() => {
          /* network blip; next event retries */
        });
      });
      await this.refetch();
    }
    return () => this.#stop();
  }

  async #stop(): Promise<void> {
    this.#subscriberCount = Math.max(0, this.#subscriberCount - 1);
    if (this.#subscriberCount === 0 && this.#subscription) {
      await this.#subscription.unsubscribe();
      this.#subscription = null;
      this.#realtime = null;
      this.#tablesDB = null;
    }
  }

  async refetch(): Promise<void> {
    if (!this.#tablesDB) return;
    const res = await this.#tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: COLL_LINKS,
      queries: [Query.equal("active", true), Query.orderAsc("order"), Query.limit(200)],
    });
    this.links = rowsToLinks(res.rows as Array<Record<string, unknown>>);
  }
}

export const publicLinksStore = new PublicLinksStore();
