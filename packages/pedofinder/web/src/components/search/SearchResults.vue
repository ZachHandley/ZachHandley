<template>
  <div class="search-results">
    <div v-if="results.length > 0" class="results-header">
      <p class="results-count">
        Found <strong>{{ total }}</strong> result{{ total !== 1 ? 's' : '' }}
        <span v-if="queryTime" class="text-muted">
          ({{ queryTime.toFixed(2) }}ms)
        </span>
      </p>
    </div>

    <div v-if="results.length > 0" class="results-list">
      <div
        v-for="result in results"
        :key="result.document.$id"
        class="result-card card"
        @click="$router.push(`/document/${result.document.$id}`)"
      >
        <div class="result-header">
          <h3 class="result-title">{{ result.document.filename }}</h3>
          <span v-if="result.score < 1" class="badge badge-success">
            {{ (result.score * 100).toFixed(1) }}% match
          </span>
        </div>

        <p v-if="result.document.summary" class="result-summary">
          {{ result.document.summary }}
        </p>

        <div v-if="result.highlights.length > 0" class="result-highlights">
          <p
            v-for="(highlight, idx) in result.highlights.slice(0, 2)"
            :key="idx"
            class="highlight-text"
            v-html="highlightQuery(highlight.fragment)"
          ></p>
        </div>

        <div class="result-meta">
          <div class="result-tags">
            <span
              v-for="tag in result.document.tags.slice(0, 3)"
              :key="tag"
              class="badge badge-secondary"
            >
              {{ tag }}
            </span>
          </div>
          <span class="result-date">
            {{ formatDate(result.document.$createdAt) }}
          </span>
        </div>
      </div>
    </div>

    <div v-else-if="!isLoading" class="no-results">
      <p>No results found. Try different search terms or adjust your filters.</p>
    </div>

    <div v-if="showPagination" class="pagination">
      <button
        class="btn btn-secondary"
        :disabled="page === 0"
        @click="$emit('changePage', page - 1)"
      >
        Previous
      </button>
      <span class="page-info">
        Page {{ page + 1 }} of {{ totalPages }}
      </span>
      <button
        class="btn btn-secondary"
        :disabled="page >= totalPages - 1"
        @click="$emit('changePage', page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SearchResult } from '@/types/documents';

interface Props {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  queryTime?: number;
  isLoading?: boolean;
  query?: string;
}

interface Emits {
  (e: 'changePage', page: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  queryTime: 0,
  isLoading: false,
  query: '',
});

const emit = defineEmits<Emits>();

const totalPages = computed(() => Math.ceil(props.total / props.pageSize));

const showPagination = computed(() => props.total > props.pageSize);

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function highlightQuery(text: string): string {
  if (!props.query) return text;

  const words = props.query.split(/\s+/).filter(w => w.length > 2);
  let highlighted = text;

  for (const word of words) {
    const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark class="highlight">$1</mark>');
  }

  return highlighted;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
</script>

<style scoped>
.search-results {
  width: 100%;
}

.results-header {
  margin-bottom: 1.5rem;
}

.results-count {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.results-count strong {
  color: var(--color-text);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-card {
  cursor: pointer;
  transition: all 0.2s;
}

.result-card:hover {
  transform: translateX(4px);
  border-color: var(--color-primary);
}

.result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.result-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  flex: 1;
}

.result-summary {
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.result-highlights {
  background: var(--color-bg-tertiary);
  border-left: 3px solid var(--color-primary);
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 0.25rem;
}

.highlight-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.highlight-text:last-child {
  margin-bottom: 0;
}

.highlight-text :deep(mark) {
  background: rgba(245, 158, 11, 0.3);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.result-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.result-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.result-date {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.no-results {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-muted);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

.page-info {
  color: var(--color-text-secondary);
  min-width: 150px;
  text-align: center;
}

@media (max-width: 640px) {
  .result-header {
    flex-direction: column;
  }

  .pagination {
    flex-wrap: wrap;
  }
}
</style>
