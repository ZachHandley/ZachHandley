import { z } from 'zod';

// Related entity schema
export const RelatedEntitySchema = z.object({
  entity_id: z.string(),
  entity_type: z.enum(['person', 'org', 'location', 'date']),
  co_occurrence_count: z.number(),
  relationship_type: z.string().optional(),
});

export type RelatedEntity = z.infer<typeof RelatedEntitySchema>;

// Base entity schema
const BaseEntitySchema = z.object({
  $id: z.string(),
  name: z.string(),
  normalized_name: z.string(),
  mention_count: z.number(),
  document_ids: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  related_entities: z.array(RelatedEntitySchema),
  first_mention_date: z.string().datetime().optional(),
  last_mention_date: z.string().datetime().optional(),
  $createdAt: z.string().datetime().optional(),
  $updatedAt: z.string().datetime().optional(),
});

// Person entity
export const EntityPersonSchema = BaseEntitySchema.extend({
  entity_type: z.literal('person'),
  aliases: z.array(z.string()).default([]),
  titles: z.array(z.string()).default([]),
  organizations: z.array(z.string()).default([]),
});

export type EntityPerson = z.infer<typeof EntityPersonSchema>;

// Organization entity
export const EntityOrgSchema = BaseEntitySchema.extend({
  entity_type: z.literal('org'),
  aliases: z.array(z.string()).default([]),
  industry: z.string().optional(),
  location: z.string().optional(),
  people: z.array(z.string()).default([]),
});

export type EntityOrg = z.infer<typeof EntityOrgSchema>;

// Location entity
export const EntityLocationSchema = BaseEntitySchema.extend({
  entity_type: z.literal('location'),
  country: z.string().optional(),
  region: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

export type EntityLocation = z.infer<typeof EntityLocationSchema>;

// Date entity
export const EntityDateSchema = z.object({
  $id: z.string(),
  date_text: z.string(),
  normalized_date: z.string().datetime(),
  mention_count: z.number(),
  document_ids: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  context: z.array(z.string()).default([]),
  $createdAt: z.string().datetime().optional(),
  $updatedAt: z.string().datetime().optional(),
});

export type EntityDate = z.infer<typeof EntityDateSchema>;

// Union type for all entities
export type Entity = EntityPerson | EntityOrg | EntityLocation | EntityDate;

// Entity type enum
export enum EntityType {
  PERSON = 'person',
  ORG = 'org',
  LOCATION = 'location',
  DATE = 'date',
}

// Network graph node
export interface NetworkNode {
  id: string;
  name: string;
  type: EntityType;
  mentionCount: number;
  category: number; // For ECharts category
  symbolSize: number;
  value: number;
  itemStyle?: {
    color?: string;
  };
}

// Network graph edge
export interface NetworkEdge {
  source: string;
  target: string;
  value: number; // co-occurrence count
  lineStyle?: {
    width?: number;
    opacity?: number;
  };
}

// Network graph data
export interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  categories: Array<{ name: string }>;
}
