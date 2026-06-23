import { AppwriteServer } from "./appwriteServer";
import type { Link } from "~/types/baseSchemas";

export async function fetchPublishedLinks(): Promise<Link[]> {
  const appwriteServer = new AppwriteServer();
  const rows = await appwriteServer.listPublished();
  return rows.map((doc) => ({
    name: doc.title,
    url: doc.url ?? undefined,
    icon: doc.icon ?? undefined,
    type: (doc.type ?? "url") as "url" | "download" | "contact" | "action" | "category",
    category: doc.category ?? undefined,
    active: doc.active,
    order: doc.order,
    featured: doc.featured ?? false,
    stack: doc.stack ?? undefined,
    repoUrl: doc.repoUrl ?? undefined,
    description: doc.description ?? undefined,
  }));
}
