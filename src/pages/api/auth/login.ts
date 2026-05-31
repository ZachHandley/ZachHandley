import type { APIRoute } from "astro";
import { SESSION_COOKIE_NAME } from "astro:env/client";
import { Account } from "node-appwrite";
import { getAppwriteClient } from "~/server/getAppwriteClient";
import { DateTime } from "luxon";
// Using a fixed cookie name; configure to match your Appwrite reverse proxy if needed

export const POST: APIRoute = async ({ request, session, cookies }) => {
  try {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };
    if (!email || !password) return new Response("Missing credentials", { status: 400 });

    const client = getAppwriteClient();
    const account = new Account(client);
    const userSession = await account.createEmailPasswordSession({
      email: email,
      password: password,
    });

    cookies.set(SESSION_COOKIE_NAME, userSession.secret, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      domain: import.meta.env.DEV
        ? "localhost"
        : `${import.meta.env.SITE.replace("https://", ".")}`, // Use domain from SITE env var in production, localhost in dev
      expires: DateTime.fromISO(userSession.expire).toJSDate(), // Set cookie to expire when session expires
    });
    session?.set("sessionToken", userSession.secret);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
};
