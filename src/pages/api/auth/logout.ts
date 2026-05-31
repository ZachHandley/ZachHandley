import type { APIRoute } from "astro";
import { Account } from "node-appwrite";
import { SESSION_COOKIE_NAME as cookieName } from "astro:env/client";
import { getAppwriteClient } from "~/server/getAppwriteClient";
// Fixed cookie name to match login handler

export const POST: APIRoute = async ({ cookies, session }) => {
  try {
    const sessionToken = session?.get("sessionToken") || cookies.get(cookieName)?.value;
    if (!sessionToken) {
      // No session token, nothing to do
      cookies.delete(cookieName);
      return new Response(null, { status: 204 });
    }
    const client = getAppwriteClient(cookies);
    const account = new Account(client);
    // Best-effort delete current session
    await account.deleteSession({ sessionId: "current" });
  } catch (_) {
    // ignore
  }
  // Clear cookie regardless
  cookies.delete(cookieName);

  return new Response(null, { status: 204 });
};
