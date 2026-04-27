/**
 * Pinecone Vector Search Service
 *
 * This service provides semantic search capabilities using Pinecone vector database.
 * Configuration is provided via environment variables.
 *
 * User needs to configure:
 * - VITE_PINECONE_API_KEY
 * - VITE_PINECONE_ENVIRONMENT
 * - VITE_PINECONE_INDEX_NAME
 */

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: {
    filename: string;
    text: string;
    document_id?: string;
    chunk_index?: number;
  };
}

export interface VectorSearchOptions {
  topK?: number;
  filter?: Record<string, unknown>;
  includeMetadata?: boolean;
  includeValues?: boolean;
}

class PineconeService {
  private apiKey: string | null;
  private environment: string | null;
  private indexName: string | null;
  private baseUrl: string | null;

  constructor() {
    this.apiKey = import.meta.env.VITE_PINECONE_API_KEY || null;
    this.environment = import.meta.env.VITE_PINECONE_ENVIRONMENT || null;
    this.indexName = import.meta.env.VITE_PINECONE_INDEX_NAME || null;
    this.baseUrl = this.environment && this.indexName
      ? `https://${this.indexName}-${this.environment}.svc.pinecone.io`
      : null;
  }

  private checkConfiguration(): void {
    if (!this.apiKey || !this.environment || !this.indexName) {
      throw new Error(
        'Pinecone is not configured. Please set VITE_PINECONE_API_KEY, VITE_PINECONE_ENVIRONMENT, and VITE_PINECONE_INDEX_NAME in your .env file.'
      );
    }
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.environment && this.indexName);
  }

  /**
   * Perform semantic search using query text
   * Note: This requires a backend service to generate embeddings from the query text
   * You'll need to implement an embedding service that can convert text to vectors
   */
  async searchByText(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    this.checkConfiguration();

    // TODO: User needs to implement embedding generation
    // This is a placeholder that shows the expected interface
    throw new Error(
      'Text-to-embedding service not implemented. You need to:\n' +
      '1. Set up an embedding service (e.g., OpenAI, Cohere, or local model)\n' +
      '2. Generate embeddings from the query text\n' +
      '3. Call searchByVector() with the generated embedding'
    );
  }

  /**
   * Perform semantic search using a pre-computed embedding vector
   */
  async searchByVector(
    vector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    this.checkConfiguration();

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Pinecone configuration is incomplete');
    }

    const {
      topK = 10,
      filter = {},
      includeMetadata = true,
      includeValues = false,
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector,
          topK,
          filter,
          includeMetadata,
          includeValues,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pinecone query failed: ${error}`);
      }

      const data = await response.json();

      return data.matches.map((match: any) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata || {},
      }));
    } catch (error) {
      console.error('Pinecone search error:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the Pinecone index
   */
  async getIndexStats(): Promise<{
    totalVectorCount: number;
    dimension: number;
    indexFullness: number;
  }> {
    this.checkConfiguration();

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Pinecone configuration is incomplete');
    }

    try {
      const response = await fetch(`${this.baseUrl}/describe_index_stats`, {
        method: 'POST',
        headers: {
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get index stats: ${error}`);
      }

      const data = await response.json();

      return {
        totalVectorCount: data.totalVectorCount || 0,
        dimension: data.dimension || 0,
        indexFullness: data.indexFullness || 0,
      };
    } catch (error) {
      console.error('Failed to get Pinecone index stats:', error);
      throw error;
    }
  }

  /**
   * Fetch vectors by ID
   */
  async fetchById(ids: string[]): Promise<VectorSearchResult[]> {
    this.checkConfiguration();

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Pinecone configuration is incomplete');
    }

    try {
      const response = await fetch(`${this.baseUrl}/vectors/fetch`, {
        method: 'GET',
        headers: {
          'Api-Key': this.apiKey,
        },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch vectors: ${error}`);
      }

      const data = await response.json();

      return Object.entries(data.vectors || {}).map(([id, vector]: [string, any]) => ({
        id,
        score: 1.0,
        metadata: vector.metadata || {},
      }));
    } catch (error) {
      console.error('Failed to fetch Pinecone vectors:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pineconeService = new PineconeService();

/**
 * Helper function to check if Pinecone is configured
 */
export function isPineconeConfigured(): boolean {
  return pineconeService.isConfigured();
}
