import { z } from 'zod';
import type { Document, DocumentListItem } from './documents';
import type { Entity } from './entities';

// Pagination parameters
export interface PaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// Appwrite document list response
export interface AppwriteDocumentList<T> {
  total: number;
  documents: T[];
}

// Search filters
export const SearchFiltersSchema = z.object({
  entityTypes: z.array(z.enum(['person', 'org', 'location', 'date'])).optional(),
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

// Search request
export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  useSemanticSearch?: boolean;
  pagination?: PaginationParams;
}

// Search response
export interface SearchResponse {
  results: Array<{
    document: DocumentListItem;
    score: number;
    highlights: Array<{
      field: string;
      fragment: string;
    }>;
  }>;
  total: number;
  queryTime: number;
  page: number;
  pageSize: number;
}

// Vector search result
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: {
    filename: string;
    text: string;
    document_id?: string;
  };
}

// Statistics response
export interface StatisticsData {
  totalDocuments: number;
  totalEntities: {
    people: number;
    organizations: number;
    locations: number;
    dates: number;
  };
  topPeople: Array<{
    id: string;
    name: string;
    mentionCount: number;
  }>;
  topOrganizations: Array<{
    id: string;
    name: string;
    mentionCount: number;
  }>;
  topLocations: Array<{
    id: string;
    name: string;
    mentionCount: number;
  }>;
  documentTimeline: Array<{
    date: string;
    count: number;
  }>;
  entityDistribution: {
    people: number;
    organizations: number;
    locations: number;
    dates: number;
  };
  processingStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

// API Error response
export interface ApiError {
  message: string;
  code?: string;
  type?: string;
  details?: unknown;
}

// Loading state
export interface LoadingState {
  isLoading: boolean;
  error: ApiError | null;
}

// Entity with related data
export interface EntityWithRelations extends Entity {
  relatedDocuments?: DocumentListItem[];
  relatedEntities?: Entity[];
}

// Co-occurrence data for heatmap
export interface CoOccurrenceData {
  entities: string[];
  matrix: number[][];
}
