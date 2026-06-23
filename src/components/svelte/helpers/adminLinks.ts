// Simple client-side helpers for admin link management
// Calls same-origin API routes which enforce admin via server-side label check

export type CreateLinkInput = {
  title: string;
  url?: string;
  icon?: string;
  type?: "url" | "download" | "contact";
  category?: string;
  active?: boolean;
  order?: number;
};

export async function createLink(input: CreateLinkInput) {
  const res = await fetch("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", payload: input }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

export async function updateLink(id: string, updates: Partial<CreateLinkInput>) {
  const res = await fetch("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", payload: { id, ...updates } }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  return res.json();
}

export async function deleteLink(id: string) {
  const res = await fetch("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", payload: { id } }),
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
}
