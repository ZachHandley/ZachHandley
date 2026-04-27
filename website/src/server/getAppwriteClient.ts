import { Client, type Models } from "node-appwrite";
import { type AstroCookies } from "astro";
import { getSecret } from "astro:env/server";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, SESSION_COOKIE_NAME } from "astro:env/client";

export const getAppwriteClient = (
  cookies?: AstroCookies,
  jwt?: string,
  useSessionKey: boolean = false,
  useApiKey: boolean = false,
  sessionToken?: string
): Client => {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

  // Priority: API Key > Session Key > User Session/JWT
  if (useApiKey) {
    const apiKey = getSecret("APPWRITE_API_KEY");
    if (apiKey) client.setKey(apiKey);
    return client;
  } else if (useSessionKey) {
    const sessionKey = getSecret("APPWRITE_SESSION_KEY");
    if (sessionKey) {
      client.setKey(sessionKey);
      return client;
    }
  }

  // User authentication - check for session cookie first, then JWT
  const cookieValue = cookies?.get(SESSION_COOKIE_NAME)?.value;
  if (cookieValue || sessionToken) {
    client.setSession(cookieValue || sessionToken!);
  } else if (jwt) {
    client.setJWT(jwt);
  }
  // If no authentication method is available, return client without auth
  // This allows for unauthenticated operations where permitted

  return client;
};

export const isUserAdmin = (user: Models.User<Models.Preferences>): boolean => {
  return user?.labels?.includes("admin") || false;
}

export const isUserCreator = (user: Models.User<Models.Preferences>): boolean => {
  return user?.labels?.includes("creator") || false;
}
