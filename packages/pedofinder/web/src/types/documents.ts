import { z } from 'zod';

// Document metadata
export const DocumentMetadataSchema = z.object({
  source: z.string(),
  page_count: z.number().optional(),
  file_size: z.number().optional(),
  processing_date: z.string().datetime().optional(),
  ocr_applied: z.boolean().default(false),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

// Extracted entity reference in document
export const EntityReferenceSchema = z.object({
  entity_id: z.string(),
  entity_type: z.enum(['person', 'org', 'location', 'date']),
  entity_name: z.string(),
  mention_count: z.number(),
  positions: z.array(z.object({
    start: z.number(),
    end: z.number(),
    context: z.string(),
  })),
  confidence: z.number().min(0).max(1),
});

export type EntityReference = z.infer<typeof EntityReferenceSchema>;

// Document schema
export const DocumentSchema = z.object({
  $id: z.string(),
  filename: z.string(),
  document_id: z.string(),
  raw_text: z.string(),
  processed_text: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: DocumentMetadataSchema,
  entities: z.array(EntityReferenceSchema).default([]),
  embedding_id: z.string().optional(),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed']),
  error_message: z.string().optional(),
  $createdAt: z.string().datetime(),
  $updatedAt: z.string().datetime(),
});

export type Document = z.infer<typeof DocumentSchema>;

// Document list item (lighter version for lists)
export const DocumentListItemSchema = z.object({
  $id: z.string(),
  filename: z.string(),
  document_id: z.string(),
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  entity_count: z.number().default(0),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed']),
  $createdAt: z.string().datetime(),
});

export type DocumentListItem = z.infer<typeof DocumentListItemSchema>;

// Search result highlight
export interface SearchHighlight {
  field: string;
  fragment: string;
  positions: Array<{ start: number; end: number }>;
}

// Search result
export interface SearchResult {
  document: DocumentListItem;
  score: number;
  highlights: SearchHighlight[];
  matchedEntities?: string[];
}
