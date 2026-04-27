<template>
  <div class="page entity-page">
    <div class="container">
      <div v-if="isLoading" class="loading-container">
        <div class="loading"></div>
        <p>Loading entity...</p>
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <div v-else-if="entity" class="entity-content">
        <header class="entity-header">
          <div class="entity-title-section">
            <h1 class="entity-name">{{ entity.name }}</h1>
            <span :class="`badge badge-${entity.entity_type}`">
              {{ entity.entity_type }}
            </span>
          </div>
          <div class="entity-confidence">
            Confidence: {{ (entity.confidence * 100).toFixed(0) }}%
          </div>
        </header>

        <div class="entity-stats-grid">
          <div class="stat-card card">
            <div class="stat-label">Total Mentions</div>
            <div class="stat-value">{{ entity.mention_count }}</div>
          </div>
          <div class="stat-card card">
            <div class="stat-label">Documents</div>
            <div class="stat-value">{{ entity.document_ids.length }}</div>
          </div>
          <div class="stat-card card">
            <div class="stat-label">Related Entities</div>
            <div class="stat-value">{{ entity.related_entities.length }}</div>
          </div>
        </div>

        <div class="entity-sections">
          <section class="card">
            <h2 class="section-title">Related Entities</h2>
            <div v-if="entity.related_entities.length > 0" class="related-entities">
              <div
                v-for="rel in entity.related_entities.slice(0, 10)"
                :key="rel.entity_id"
                class="related-entity"
                @click="navigateToEntity(rel.entity_id, rel.entity_type)"
              >
                <span :class="`badge badge-${rel.entity_type}`">
                  {{ rel.entity_type }}
                </span>
                <span class="related-name">{{ rel.entity_id }}</span>
                <span class="related-count">
                  {{ rel.co_occurrence_count }} co-occurrences
                </span>
              </div>
            </div>
            <p v-else class="text-muted">No related entities found.</p>
          </section>

          <section class="card">
            <h2 class="section-title">Documents Mentioning This Entity</h2>
            <DocumentList
              :documents="relatedDocuments"
              :is-loading="loadingDocuments"
            />
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DocumentList from '@/components/document/DocumentList.vue';
import { entitiesApi, documentsApi } from '@/services/appwrite';
import type { Entity } from '@/types/entities';
import type { DocumentListItem } from '@/types/documents';

interface Props {
  type: 'person' | 'org' | 'location' | 'date';
  id: string;
}

const props = defineProps<Props>();
const router = useRouter();

const isLoading = ref(false);
const loadingDocuments = ref(false);
const error = ref<string | null>(null);
const entity = ref<Entity | null>(null);
const relatedDocuments = ref<DocumentListItem[]>([]);

onMounted(async () => {
  await loadEntity();
});

async function loadEntity() {
  isLoading.value = true;
  error.value = null;

  try {
    entity.value = await entitiesApi.getById(props.id, props.type);
    await loadRelatedDocuments();
  } catch (err: any) {
    error.value = err.message || 'Failed to load entity';
  } finally {
    isLoading.value = false;
  }
}

async function loadRelatedDocuments() {
  if (!entity.value) return;

  loadingDocuments.value = true;

  try {
    const docPromises = entity.value.document_ids.slice(0, 10).map(docId =>
      documentsApi.get(docId).catch(() => null)
    );
    const docs = await Promise.all(docPromises);
    relatedDocuments.value = docs.filter((d): d is DocumentListItem => d !== null);
  } catch (err) {
    console.error('Failed to load related documents:', err);
  } finally {
    loadingDocuments.value = false;
  }
}

function navigateToEntity(entityId: string, entityType: string) {
  router.push(`/entity/${entityType}/${entityId}`);
}
</script>

<style scoped>
.entity-page {
  padding: 2rem 0 4rem;
}

.entity-header {
  margin-bottom: 2rem;
}

.entity-title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.entity-name {
  font-size: 2.5rem;
  margin: 0;
}

.entity-confidence {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
}

.entity-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  text-align: center;
  padding: 1.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
}

.entity-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-title {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.related-entities {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.related-entity {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-tertiary);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.related-entity:hover {
  background: var(--color-border);
  transform: translateX(4px);
}

.related-name {
  flex: 1;
  font-weight: 500;
}

.related-count {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.text-muted {
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
