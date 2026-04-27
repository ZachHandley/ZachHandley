<template>
  <div class="page home-page">
    <div class="container">
      <header class="page-header">
        <h1>Document Search</h1>
        <p class="page-description">
          Search and analyze Epstein court documents. Use full-text search or semantic search to find relevant information.
        </p>
      </header>

      <div class="search-section">
        <SearchBar
          :query="searchQuery"
          :is-loading="isLoading"
          @search="handleSearch"
          @toggle-filters="showFilters = !showFilters"
        />

        <SearchFilters
          :show="showFilters"
          :filters="filters"
          @update:filters="handleFiltersUpdate"
        />
      </div>

      <div v-if="isLoading" class="loading-container">
        <div class="loading"></div>
        <p>Searching documents...</p>
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <SearchResults
        v-else-if="hasSearched"
        :results="searchResults"
        :total="totalResults"
        :page="currentPage"
        :page-size="pageSize"
        :query-time="queryTime"
        :query="searchQuery"
        @change-page="handlePageChange"
      />

      <div v-else class="empty-state">
        <h2>Start Searching</h2>
        <p>Enter a search query to find documents, people, organizations, and locations.</p>

        <div class="quick-stats">
          <div class="stat-card card">
            <div class="stat-icon">📄</div>
            <div class="stat-value">{{ statistics.totalDocuments }}</div>
            <div class="stat-label">Total Documents</div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon">👥</div>
            <div class="stat-value">{{ statistics.totalEntities.people }}</div>
            <div class="stat-label">People</div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon">🏢</div>
            <div class="stat-value">{{ statistics.totalEntities.organizations }}</div>
            <div class="stat-label">Organizations</div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon">📍</div>
            <div class="stat-value">{{ statistics.totalEntities.locations }}</div>
            <div class="stat-label">Locations</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SearchBar from '@/components/search/SearchBar.vue';
import SearchFilters from '@/components/search/SearchFilters.vue';
import SearchResults from '@/components/search/SearchResults.vue';
import { searchService } from '@/services/search';
import { documentsApi, peopleApi, organizationsApi, locationsApi } from '@/services/appwrite';
import type { SearchFilters as SearchFiltersType } from '@/types/api';
import type { SearchResult } from '@/types/documents';

const searchQuery = ref('');
const showFilters = ref(false);
const filters = ref<SearchFiltersType>({});
const isLoading = ref(false);
const error = ref<string | null>(null);
const hasSearched = ref(false);

const searchResults = ref<SearchResult[]>([]);
const totalResults = ref(0);
const currentPage = ref(0);
const pageSize = ref(20);
const queryTime = ref(0);
const useSemanticSearch = ref(false);

const statistics = ref({
  totalDocuments: 0,
  totalEntities: {
    people: 0,
    organizations: 0,
    locations: 0,
    dates: 0,
  },
});

onMounted(async () => {
  await loadStatistics();
});

async function loadStatistics() {
  try {
    const [docs, people, orgs, locations] = await Promise.all([
      documentsApi.list({ limit: 1 }),
      peopleApi.list({ limit: 1 }),
      organizationsApi.list({ limit: 1 }),
      locationsApi.list({ limit: 1 }),
    ]);

    statistics.value = {
      totalDocuments: docs.total,
      totalEntities: {
        people: people.total,
        organizations: orgs.total,
        locations: locations.total,
        dates: 0,
      },
    };
  } catch (err) {
    console.error('Failed to load statistics:', err);
  }
}

async function handleSearch(query: string, semantic: boolean) {
  searchQuery.value = query;
  useSemanticSearch.value = semantic;
  currentPage.value = 0;
  await performSearch();
}

async function performSearch() {
  if (!searchQuery.value.trim()) return;

  isLoading.value = true;
  error.value = null;
  hasSearched.value = true;

  try {
    const response = useSemanticSearch.value
      ? await searchService.semanticSearch(searchQuery.value, pageSize.value)
      : await searchService.searchDocuments({
          query: searchQuery.value,
          filters: filters.value,
          pagination: {
            limit: pageSize.value,
            offset: currentPage.value * pageSize.value,
            orderBy: 'mention_count',
            orderDirection: 'desc',
          },
        });

    searchResults.value = response.results;
    totalResults.value = response.total;
    queryTime.value = response.queryTime;
  } catch (err: any) {
    error.value = err.message || 'Search failed. Please try again.';
    searchResults.value = [];
    totalResults.value = 0;
  } finally {
    isLoading.value = false;
  }
}

function handleFiltersUpdate(newFilters: SearchFiltersType) {
  filters.value = newFilters;
  if (hasSearched.value) {
    currentPage.value = 0;
    performSearch();
  }
}

function handlePageChange(page: number) {
  currentPage.value = page;
  performSearch();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<style scoped>
.home-page {
  padding: 2rem 0 4rem;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.page-description {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

.search-section {
  max-width: 900px;
  margin: 0 auto 3rem;
}

.empty-state {
  text-align: center;
  padding: 2rem 0;
}

.empty-state h2 {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
  color: var(--color-text);
}

.empty-state p {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  max-width: 1000px;
  margin: 2rem auto 0;
}

.stat-card {
  text-align: center;
  padding: 2rem 1rem;
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 1rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media (max-width: 768px) {
  .page-header h1 {
    font-size: 2rem;
  }

  .page-description {
    font-size: 1rem;
  }

  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
