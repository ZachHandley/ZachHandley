<template>
  <div class="search-bar">
    <div class="search-input-wrapper">
      <input
        v-model="localQuery"
        type="text"
        class="input search-input"
        placeholder="Search documents, people, organizations, locations..."
        @keyup.enter="handleSearch"
      />
      <button
        class="btn btn-primary search-button"
        :disabled="!localQuery.trim() || isLoading"
        @click="handleSearch"
      >
        <span v-if="!isLoading">Search</span>
        <span v-else class="loading"></span>
      </button>
    </div>

    <div class="search-options">
      <label class="checkbox-label">
        <input
          v-model="useSemanticSearch"
          type="checkbox"
          :disabled="!isPineconeAvailable"
        />
        <span>
          Semantic Search
          <span v-if="!isPineconeAvailable" class="text-muted">(Not configured)</span>
        </span>
      </label>

      <button
        class="btn btn-secondary btn-sm"
        @click="toggleFilters"
      >
        {{ showFilters ? 'Hide' : 'Show' }} Filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { isPineconeConfigured } from '@/services/pinecone';

interface Props {
  query?: string;
  isLoading?: boolean;
}

interface Emits {
  (e: 'search', query: string, useSemanticSearch: boolean): void;
  (e: 'toggleFilters'): void;
}

const props = withDefaults(defineProps<Props>(), {
  query: '',
  isLoading: false,
});

const emit = defineEmits<Emits>();

const localQuery = ref(props.query);
const useSemanticSearch = ref(false);
const showFilters = ref(false);
const isPineconeAvailable = isPineconeConfigured();

watch(() => props.query, (newQuery) => {
  localQuery.value = newQuery;
});

function handleSearch() {
  if (!localQuery.value.trim()) return;
  emit('search', localQuery.value.trim(), useSemanticSearch.value);
}

function toggleFilters() {
  showFilters.value = !showFilters.value;
  emit('toggleFilters');
}
</script>

<style scoped>
.search-bar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.search-input-wrapper {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.search-input {
  flex: 1;
  font-size: 1.125rem;
  padding: 1rem 1.25rem;
}

.search-button {
  min-width: 120px;
  white-space: nowrap;
}

.search-options {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-muted {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  .search-input-wrapper {
    flex-direction: column;
  }

  .search-button {
    width: 100%;
  }

  .search-options {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
