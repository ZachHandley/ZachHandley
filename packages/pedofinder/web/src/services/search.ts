import { documentsApi, peopleApi, organizationsApi, locationsApi } from './appwrite';
import { pineconeService } from './pinecone';
import type { SearchRequest, SearchResponse, SearchFilters } from '@/types/api';
import type { DocumentListItem } from '@/types/documents';
import type { Entity } from '@/types/entities';

/**
 * Unified search service that combines Appwrite full-text search
 * and Pinecone semantic search
 */
class SearchService {
  /**
   * Perform full-text search using Appwrite
   */
  async searchDocuments(request: SearchRequest): Promise<SearchResponse> {
    const startTime = performance.now();
    const { query, filters, pagination } = request;

    try {
      // Basic search
      const result = await documentsApi.search(query, {
        limit: pagination?.limit || 20,
        offset: pagination?.offset || 0,
        orderBy: pagination?.orderBy || 'mention_count',
        orderDirection: pagination?.orderDirection || 'desc',
      });

      const queryTime = performance.now() - startTime;

      // Transform to search response format
      return {
        results: result.documents.map(doc => ({
          document: doc as DocumentListItem,
          score: 1.0, // Appwrite doesn't provide relevance scores
          highlights: this.extractHighlights(doc.raw_text || '', query),
        })),
        total: result.total,
        queryTime,
        page: Math.floor((pagination?.offset || 0) / (pagination?.limit || 20)),
        pageSize: pagination?.limit || 20,
      };
    } catch (error) {
      console.error('Document search failed:', error);
      throw error;
    }
  }

  /**
   * Perform semantic search using Pinecone (if configured)
   */
  async semanticSearch(query: string, topK: number = 10): Promise<SearchResponse> {
    const startTime = performance.now();

    if (!pineconeService.isConfigured()) {
      throw new Error('Pinecone is not configured. Cannot perform semantic search.');
    }

    try {
      // Note: This will throw until embedding service is implemented
      const vectorResults = await pineconeService.searchByText(query, { topK });

      // Fetch full document data from Appwrite
      const documentPromises = vectorResults.map(async (result) => {
        try {
          const doc = await documentsApi.getByFilename(result.metadata.filename);
          return doc ? {
            document: doc as DocumentListItem,
            score: result.score,
            highlights: [{ field: 'text', fragment: result.metadata.text }],
          } : null;
        } catch (error) {
          console.error(`Failed to fetch document ${result.metadata.filename}:`, error);
          return null;
        }
      });

      const documents = (await Promise.all(documentPromises)).filter((d): d is NonNullable<typeof d> => d !== null);

      const queryTime = performance.now() - startTime;

      return {
        results: documents,
        total: documents.length,
        queryTime,
        page: 0,
        pageSize: topK,
      };
    } catch (error) {
      console.error('Semantic search failed:', error);
      throw error;
    }
  }

  /**
   * Search across all entity types
   */
  async searchEntities(query: string, entityTypes?: ('person' | 'org' | 'location')[]): Promise<Entity[]> {
    const types = entityTypes || ['person', 'org', 'location'];
    const results: Entity[] = [];

    const promises = [];

    if (types.includes('person')) {
      promises.push(peopleApi.search(query, { limit: 10 }));
    }
    if (types.includes('org')) {
      promises.push(organizationsApi.search(query, { limit: 10 }));
    }
    if (types.includes('location')) {
      promises.push(locationsApi.search(query, { limit: 10 }));
    }

    const allResults = await Promise.all(promises);

    for (const result of allResults) {
      results.push(...result.documents);
    }

    // Sort by mention count
    return results.sort((a, b) => b.mention_count - a.mention_count);
  }

  /**
   * Extract highlights from text
   */
  private extractHighlights(text: string, query: string): Array<{ field: string; fragment: string }> {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);

    const highlights: Array<{ field: string; fragment: string }> = [];

    for (const word of words) {
      if (word.length < 3) continue; // Skip very short words

      let index = lowerText.indexOf(word);
      let count = 0;

      while (index !== -1 && count < 3) {
        // Max 3 highlights per word
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + word.length + 50);
        const fragment = text.slice(start, end);

        highlights.push({
          field: 'raw_text',
          fragment: start > 0 ? '...' + fragment : fragment + (end < text.length ? '...' : ''),
        });

        index = lowerText.indexOf(word, index + 1);
        count++;
      }
    }

    return highlights.slice(0, 5); // Return max 5 highlights
  }

  /**
   * Apply filters to search results (client-side filtering)
   */
  private applyFilters(documents: DocumentListItem[], filters?: SearchFilters): DocumentListItem[] {
    if (!filters) return documents;

    let filtered = documents;

    if (filters.dateRange) {
      filtered = filtered.filter(doc => {
        const createdAt = new Date(doc.$createdAt);
        const from = filters.dateRange?.from ? new Date(filters.dateRange.from) : null;
        const to = filters.dateRange?.to ? new Date(filters.dateRange.to) : null;

        if (from && createdAt < from) return false;
        if (to && createdAt > to) return false;
        return true;
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(doc =>
        filters.tags?.some(tag => doc.tags.includes(tag))
      );
    }

    if (filters.status) {
      filtered = filtered.filter(doc => doc.processing_status === filters.status);
    }

    return filtered;
  }
}

export const searchService = new SearchService();
