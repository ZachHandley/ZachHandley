import { envField } from "astro/config";

// Define env schema so Astro exposes typed values via `astro:env/*`
export const env = {
  schema: {
    PRODUCTION_ENABLED: envField.boolean({
      context: "client",
      access: "public",
      default: false,
    }),
    // Public Appwrite configuration (safe for client)
    APPWRITE_ENDPOINT: envField.string({
      context: "client",
      access: "public",
      default: "https://appwrite.blackleafdigital.com/v1",
    }),
    APPWRITE_PROJECT_ID: envField.string({
      context: "client",
      access: "public",
      default: "68c3bb35001fe37018e4",
    }),
    SESSION_COOKIE_NAME: envField.string({
      context: "client",
      access: "public",
      default: "a_session_68c3bb35001fe37018e4",
    }),
    // Appwrite Database ID (for public collections)
    APPWRITE_DATABASE_ID: envField.string({
      context: "client",
      access: "public",
      default: "main",
    }),
    // Appwrite Storage bucket for public files linked from the scene
    BUCKET_FILES: envField.string({
      context: "client",
      access: "public",
      optional: true,
      default: "files",
    }),
    COLL_LINKS: envField.string({
      context: "client",
      access: "public",
      default: "links",
    }),
    // Server-only secret (accessed from `astro:env/server`)
    APPWRITE_API_KEY: envField.string({
      context: "server",
      access: "secret",
    }),
  },
};
