<template>
  <div class="document-list">
    <div v-if="documents.length === 0 && !isLoading" class="no-documents">
      <p>No documents found.</p>
    </div>

    <div v-else class="documents-grid">
      <div
        v-for="doc in documents"
        :key="doc.$id"
        class="document-card card"
        @click="$router.push(`/document/${doc.$id}`)"
      >
        <div class="document-header">
          <h3 class="document-title truncate">{{ doc.filename }}</h3>
          <span
            :class="`badge badge-${getStatusColor(doc.processing_status)}`"
          >
            {{ doc.processing_status }}
          </span>
        </div>

        <p v-if="doc.summary" class="document-summary">
          {{ truncateText(doc.summary, 150) }}
        </p>

        <div class="document-meta">
          <div class="document-tags">
            <span
              v-for="tag in doc.tags.slice(0, 3)"
              :key="tag"
              class="badge badge-secondary"
            >
              {{ tag }}
            </span>
          </div>
          <span class="document-date">
            {{ formatDate(doc.$createdAt) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DocumentListItem } from '@/types/documents';

interface Props {
  documents: DocumentListItem[];
  isLoading?: boolean;
}

withDefaults(defineProps<Props>(), {
  isLoading: false,
});

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
    month: 'short',
    day: 'numeric',
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
</script>

<style scoped>
.documents-grid {
  display: grid;
  gap: 1rem;
}

.document-card {
  cursor: pointer;
}

.document-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.document-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  flex: 1;
}

.document-summary {
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.document-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.document-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.badge-primary {
  background: rgba(59, 130, 246, 0.2);
  color: var(--color-primary);
}

.document-date {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.no-documents {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-muted);
}
</style>
