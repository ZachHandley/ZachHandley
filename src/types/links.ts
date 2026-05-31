import { z } from "zod";

export const LinksSchema = z.object({
  $id: z.string(),
  $createdAt: z.string(),
  $updatedAt: z.string(),
  $permissions: z.array(z.string()),
  $databaseId: z.string(),
  $tableId: z.string(),
  $sequence: z.string(),
  title: z.string().max(256, "Maximum length of 256 characters exceeded"),
  url: z.string().max(2048, "Maximum length of 2048 characters exceeded").nullish(),
  icon: z.string().max(512, "Maximum length of 512 characters exceeded").nullish(),
  order: z.number().int(),
  active: z.boolean(),
  type: z.string().max(24, "Maximum length of 24 characters exceeded").default("url").nullish(),
  category: z.string().max(64, "Maximum length of 64 characters exceeded").nullish(),
  featured: z.boolean().default(false).nullish(),
  stack: z.array(z.string().max(64, "Maximum length of 64 characters exceeded")).nullish(),
  repoUrl: z.string().max(2048, "Maximum length of 2048 characters exceeded").nullish(),
  description: z.string().max(512, "Maximum length of 512 characters exceeded").nullish(),
});

export type Links = z.infer<typeof LinksSchema>;
