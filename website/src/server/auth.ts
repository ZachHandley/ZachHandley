import type { AstroCookies } from "astro";
import { Account } from "node-appwrite";
import { getAppwriteClient, isUserAdmin } from "~/server/getAppwriteClient";
import { SESSION_COOKIE_NAME } from "astro:env/client";

export async function requireAdmin(cookies: AstroCookies): Promise<{ ok: boolean; userId?: string }> {
  try {
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) return { ok: false };
    const client = getAppwriteClient(undefined, undefined, false, false, sessionToken);
    const account = new Account(client);
    const user = await account.get();
    if (isUserAdmin(user)) {
      return { ok: true, userId: user.$id };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

