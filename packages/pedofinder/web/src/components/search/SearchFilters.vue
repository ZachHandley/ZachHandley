<template>
  <div v-if="show" class="filters-panel">
    <h3 class="filters-title">Filters</h3>

    <div class="filter-group">
      <label class="filter-label">Entity Types</label>
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localFilters.entityTypes"
            type="checkbox"
            value="person"
          />
          <span class="badge badge-person">People</span>
        </label>
        <label class="checkbox-label">
          <input
            v-model="localFilters.entityTypes"
            type="checkbox"
            value="org"
          />
          <span class="badge badge-org">Organizations</span>
        </label>
        <label class="checkbox-label">
          <input
            v-model="localFilters.entityTypes"
            type="checkbox"
            value="location"
          />
          <span class="badge badge-location">Locations</span>
        </label>
        <label class="checkbox-label">
          <input
            v-model="localFilters.entityTypes"
            type="checkbox"
            value="date"
          />
          <span class="badge badge-date">Dates</span>
        </label>
      </div>
    </div>

    <div class="filter-group">
      <label class="filter-label">Date Range</label>
      <div class="date-inputs">
        <input
          v-model="localFilters.dateRange.from"
          type="date"
          class="input"
          placeholder="From"
        />
        <span>to</span>
        <input
          v-model="localFilters.dateRange.to"
          type="date"
          class="input"
          placeholder="To"
        />
      </div>
    </div>

    <div class="filter-group">
      <label class="filter-label">
        Minimum Confidence: {{ (localFilters.minConfidence * 100).toFixed(0) }}%
      </label>
      <input
        v-model.number="localFilters.minConfidence"
        type="range"
        min="0"
        max="1"
        step="0.05"
        class="range-input"
      />
    </div>

    <div class="filter-group">
      <label class="filter-label">Processing Status</label>
      <select v-model="localFilters.status" class="input">
        <option :value="undefined">All</option>
        <option value="completed">Completed</option>
        <option value="processing">Processing</option>
        <option value="pending">Pending</option>
        <option value="failed">Failed</option>
      </select>
    </div>

    <div class="filter-actions">
      <button class="btn btn-primary" @click="applyFilters">
        Apply Filters
      </button>
      <button class="btn btn-secondary" @click="resetFilters">
        Reset
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { SearchFilters } from '@/types/api';

interface Props {
  show?: boolean;
  filters?: SearchFilters;
}

interface Emits {
  (e: 'update:filters', filters: SearchFilters): void;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  filters: () => ({
    entityTypes: [],
    dateRange: {},
    minConfidence: 0,
  }),
});

const emit = defineEmits<Emits>();

const localFilters = ref<SearchFilters>({
  entityTypes: props.filters.entityTypes || [],
  dateRange: {
    from: props.filters.dateRange?.from,
    to: props.filters.dateRange?.to,
  },
  minConfidence: props.filters.minConfidence || 0,
  status: props.filters.status,
  tags: props.filters.tags || [],
});

watch(() => props.filters, (newFilters) => {
  localFilters.value = {
    entityTypes: newFilters.entityTypes || [],
    dateRange: {
      from: newFilters.dateRange?.from,
      to: newFilters.dateRange?.to,
    },
    minConfidence: newFilters.minConfidence || 0,
    status: newFilters.status,
    tags: newFilters.tags || [],
  };
}, { deep: true });

function applyFilters() {
  emit('update:filters', localFilters.value);
}

function resetFilters() {
  localFilters.value = {
    entityTypes: [],
    dateRange: {},
    minConfidence: 0,
    tags: [],
  };
  emit('update:filters', localFilters.value);
}
</script>

<style scoped>
.filters-panel {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.filters-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.filter-group {
  margin-bottom: 1.5rem;
}

.filter-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
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

.date-inputs {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.date-inputs .input {
  flex: 1;
  min-width: 150px;
}

.range-input {
  width: 100%;
  height: 0.5rem;
  background: var(--color-bg-tertiary);
  border-radius: 0.25rem;
  outline: none;
  appearance: none;
}

.range-input::-webkit-slider-thumb {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
}

.range-input::-moz-range-thumb {
  width: 1.25rem;
  height: 1.25rem;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.filter-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

@media (max-width: 640px) {
  .filter-actions {
    flex-direction: column;
  }

  .filter-actions .btn {
    width: 100%;
  }
}
</style>
