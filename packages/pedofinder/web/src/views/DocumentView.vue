<template>
  <div class="page document-page">
    <div class="container">
      <div v-if="isLoading" class="loading-container">
        <div class="loading"></div>
        <p>Loading document...</p>
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <div v-else-if="document" class="document-content">
        <header class="document-header">
          <h1 class="document-filename">{{ document.filename }}</h1>
          <span :class="`badge badge-${getStatusColor(document.processing_status)}`">
            {{ document.processing_status }}
          </span>
        </header>

        <div class="document-meta-section card">
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Document ID</span>
              <span class="meta-value">{{ document.document_id }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Created</span>
              <span class="meta-value">{{ formatDate(document.$createdAt) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Entities Extracted</span>
              <span class="meta-value">{{ document.entities.length }}</span>
            </div>
          </div>

          <div v-if="document.tags.length > 0" class="document-tags">
            <span
              v-for="tag in document.tags"
              :key="tag"
              class="badge badge-secondary"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div v-if="document.summary" class="document-summary card">
          <h2 class="section-title">Summary</h2>
          <p>{{ document.summary }}</p>
        </div>

        <div class="document-layout">
          <aside class="entities-sidebar card">
            <h2 class="section-title">Extracted Entities</h2>
            <div v-if="document.entities.length > 0" class="entities-list">
              <div
                v-for="entity in document.entities"
                :key="`${entity.entity_type}-${entity.entity_id}`"
                class="entity-item"
                @click="$router.push(`/entity/${entity.entity_type}/${entity.entity_id}`)"
              >
                <div class="entity-item-header">
                  <span :class="`badge badge-${entity.entity_type}`">
                    {{ entity.entity_type }}
                  </span>
                  <span class="entity-mentions">
                    {{ entity.mention_count }}x
                  </span>
                </div>
                <div class="entity-name">{{ entity.entity_name }}</div>
                <div class="entity-confidence">
                  {{ (entity.confidence * 100).toFixed(0) }}% confidence
                </div>
              </div>
            </div>
            <p v-else class="text-muted">No entities extracted yet.</p>
          </aside>

          <main class="document-text-section card">
            <h2 class="section-title">Document Text</h2>
            <div class="document-text" v-html="highlightedText"></div>
          </main>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { documentsApi } from '@/services/appwrite';
import type { Document } from '@/types/documents';

interface Props {
  id: string;
}

const props = defineProps<Props>();

const isLoading = ref(false);
const error = ref<string | null>(null);
const document = ref<Document | null>(null);

const highlightedText = computed(() => {
  if (!document.value) return '';

  let text = document.value.raw_text;
  const entities = document.value.entities.sort((a, b) => b.entity_name.length - a.entity_name.length);

  const entityColors: Record<string, string> = {
    person: 'var(--color-person)',
    org: 'var(--color-org)',
    location: 'var(--color-location)',
    date: 'var(--color-date)',
  };

  entities.forEach(entity => {
    const color = entityColors[entity.entity_type] || 'var(--color-primary)';
    const regex = new RegExp(`\\b${escapeRegex(entity.entity_name)}\\b`, 'gi');
    text = text.replace(
      regex,
      `<mark style="background-color: ${color}20; color: ${color}; padding: 2px 4px; border-radius: 3px; font-weight: 500;">$&</mark>`
    );
  });

  return text.replace(/\n/g, '<br>');
});

onMounted(async () => {
  await loadDocument();
});

async function loadDocument() {
  isLoading.value = true;
  error.value = null;

  try {
    document.value = await documentsApi.get(props.id);
  } catch (err: any) {
    error.value = err.message || 'Failed to load document';
  } finally {
    isLoading.value = false;
  }
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'success',
    processing: 'primary',
    pending: 'warning',
    failed: 'danger',
  };
  return colors[status] || 'secondary';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
</script>

<style scoped>
.document-page {
  padding: 2rem 0 4rem;
}

.document-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.document-filename {
  font-size: 2rem;
  margin: 0;
  flex: 1;
  word-break: break-word;
}

.document-meta-section {
  margin-bottom: 2rem;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text);
}

.document-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.badge-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.document-summary {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.document-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
}

.entities-sidebar {
  position: sticky;
  top: 6rem;
  max-height: calc(100vh - 8rem);
  overflow-y: auto;
}

.entities-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.entity-item {
  padding: 0.75rem;
  background: var(--color-bg-tertiary);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.entity-item:hover {
  background: var(--color-border);
  transform: translateX(4px);
}

.entity-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.entity-mentions {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.entity-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.entity-confidence {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.document-text-section {
  min-height: 500px;
}

.document-text {
  line-height: 1.8;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.text-muted {
  color: var(--color-text-muted);
  font-style: italic;
}

@media (max-width: 1024px) {
  .document-layout {
    grid-template-columns: 1fr;
  }

  .entities-sidebar {
    position: relative;
    top: 0;
    max-height: none;
  }
}

@media (max-width: 640px) {
  .document-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .document-filename {
    font-size: 1.5rem;
  }
}
</style>
