import { z } from "zod";

export const LinkSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  action: z.custom<(() => void) | (() => Promise<void>) | undefined>().optional(),
  position: z.tuple([z.number(), z.number(), z.number()]).optional(),
  type: z.enum(["url", "download", "contact", "action", "category"]),
  icon: z
    .string()
    .or(
      z.object({
        prefix: z.string(),
        name: z.string(),
      })
    )
    .optional(),
  category: z.string().optional(),
});

export type Link = z.infer<typeof LinkSchema>;

// Helper types for component prop typing
export type LinkAction = (() => void) | (() => Promise<void>);
export type LinkClickHandler = (
  url: string, 
  type: Link["type"], 
  position: { x: number; y: number; z: number } | [number, number, number],
  action?: LinkAction
) => void;
