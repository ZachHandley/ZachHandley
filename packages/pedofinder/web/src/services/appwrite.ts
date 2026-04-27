import { Client, Databases, Query, type Models } from 'appwrite';
import type { AppwriteDocumentList, PaginationParams } from '@/types/api';
import type { Document, DocumentListItem } from '@/types/documents';
import type { Entity, EntityPerson, EntityOrg, EntityLocation, EntityDate } from '@/types/entities';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.blackleafdigital.com/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '691779a3003300288357');

const databases = new Databases(client);

// Database and collection IDs
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'pedofinder';

// Collection names (using table terminology)
const COLLECTIONS = {
  DOCUMENTS: 'documents',
  ENTITIES_PEOPLE: 'entities_people',
  ENTITIES_ORGS: 'entities_orgs',
  ENTITIES_LOCATIONS: 'entities_locations',
  ENTITIES_DATES: 'entities_dates',
} as const;

// Helper to build pagination queries
function buildPaginationQueries(params?: PaginationParams): string[] {
  const queries: string[] = [];

  if (params?.limit) {
    queries.push(Query.limit(params.limit));
  }

  if (params?.offset) {
    queries.push(Query.offset(params.offset));
  }

  if (params?.orderBy) {
    const order = params.orderDirection === 'asc'
      ? Query.orderAsc(params.orderBy)
      : Query.orderDesc(params.orderBy);
    queries.push(order);
  }

  return queries;
}

// Documents API
export const documentsApi = {
  async list(params?: PaginationParams): Promise<AppwriteDocumentList<DocumentListItem>> {
    const queries = buildPaginationQueries(params);
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as DocumentListItem[],
    };
  },

  async get(documentId: string): Promise<Document> {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      documentId
    );
    return response as unknown as Document;
  },

  async search(query: string, params?: PaginationParams): Promise<AppwriteDocumentList<Document>> {
    const queries = [
      Query.search('raw_text', query),
      ...buildPaginationQueries(params),
    ];

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as Document[],
    };
  },

  async getByFilename(filename: string): Promise<Document | null> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      [Query.equal('filename', filename), Query.limit(1)]
    );

    return response.documents.length > 0
      ? response.documents[0] as unknown as Document
      : null;
  },

  async getByStatus(status: 'pending' | 'processing' | 'completed' | 'failed', params?: PaginationParams): Promise<AppwriteDocumentList<DocumentListItem>> {
    const queries = [
      Query.equal('processing_status', status),
      ...buildPaginationQueries(params),
    ];

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as DocumentListItem[],
    };
  },
};

// People entities API
export const peopleApi = {
  async list(params?: PaginationParams): Promise<AppwriteDocumentList<EntityPerson>> {
    const queries = buildPaginationQueries(params);
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_PEOPLE,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as EntityPerson[],
    };
  },

  async get(entityId: string): Promise<EntityPerson> {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_PEOPLE,
      entityId
    );
    return response as unknown as EntityPerson;
  },

  async getTopByMentions(limit: number = 20): Promise<EntityPerson[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_PEOPLE,
      [Query.orderDesc('mention_count'), Query.limit(limit)]
    );
    return response.documents as unknown as EntityPerson[];
  },

  async search(query: string, params?: PaginationParams): Promise<AppwriteDocumentList<EntityPerson>> {
    const queries = [
      Query.search('name', query),
      ...buildPaginationQueries(params),
    ];

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_PEOPLE,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as EntityPerson[],
    };
  },
};

// Organizations entities API
export const organizationsApi = {
  async list(params?: PaginationParams): Promise<AppwriteDocumentList<EntityOrg>> {
    const queries = buildPaginationQueries(params);
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_ORGS,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as EntityOrg[],
    };
  },

  async get(entityId: string): Promise<EntityOrg> {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_ORGS,
      entityId
    );
    return response as unknown as EntityOrg;
  },

  async getTopByMentions(limit: number = 20): Promise<EntityOrg[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_ORGS,
      [Query.orderDesc('mention_count'), Query.limit(limit)]
    );
    return response.documents as unknown as EntityOrg[];
  },

  async search(query: string, params?: PaginationParams): Promise<AppwriteDocumentList<EntityOrg>> {
    const queries = [
      Query.search('name', query),
      ...buildPaginationQueries(params),
    ];

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_ORGS,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as EntityOrg[],
    };
  },
};

// Locations entities API
export const locationsApi = {
  async list(params?: PaginationParams): Promise<AppwriteDocumentList<EntityLocation>> {
    const queries = buildPaginationQueries(params);
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_LOCATIONS,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as EntityLocation[],
    };
  },

  async get(entityId: string): Promise<EntityLocation> {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_LOCATIONS,
      entityId
    );
    return response as unknown as EntityLocation;
  },

  async getTopByMentions(limit: number = 20): Promise<EntityLocation[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_LOCATIONS,
      [Query.orderDesc('mention_count'), Query.limit(limit)]
    );
    return response.documents as unknown as EntityLocation[];
  },

  async search(query: string, params?: PaginationParams): Promise<AppwriteDocumentList<EntityLocation>> {
    const queries = [
      Query.search('name', query),
      ...buildPaginationQueries(params),
    ];

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_LOCATIONS,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as EntityLocation[],
    };
  },
};

// Dates entities API
export const datesApi = {
  async list(params?: PaginationParams): Promise<AppwriteDocumentList<EntityDate>> {
    const queries = buildPaginationQueries(params);
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_DATES,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as EntityDate[],
    };
  },

  async get(entityId: string): Promise<EntityDate> {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_DATES,
      entityId
    );
    return response as unknown as EntityDate;
  },

  async getByDateRange(from: string, to: string, params?: PaginationParams): Promise<AppwriteDocumentList<EntityDate>> {
    const queries = [
      Query.greaterThanEqual('normalized_date', from),
      Query.lessThanEqual('normalized_date', to),
      ...buildPaginationQueries(params),
    ];

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENTITIES_DATES,
      queries
    );

    return {
      total: response.total,
      documents: response.documents as unknown as EntityDate[],
    };
  },
};

// Generic entity API (abstracts over all entity types)
export const entitiesApi = {
  async getById(entityId: string, entityType: 'person' | 'org' | 'location' | 'date'): Promise<Entity> {
    switch (entityType) {
      case 'person':
        return peopleApi.get(entityId);
      case 'org':
        return organizationsApi.get(entityId);
      case 'location':
        return locationsApi.get(entityId);
      case 'date':
        return datesApi.get(entityId);
    }
  },

  async getMultiple(ids: Array<{ id: string; type: 'person' | 'org' | 'location' | 'date' }>): Promise<Entity[]> {
    const promises = ids.map(({ id, type }) => this.getById(id, type));
    return Promise.all(promises);
  },
};

// Export client for custom queries
export { client, databases, DATABASE_ID, COLLECTIONS };
