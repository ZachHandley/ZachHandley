<template>
  <div class="document-viewer card">
    <div class="viewer-header">
      <h3 class="viewer-title">{{ document.filename }}</h3>
      <button class="btn btn-sm btn-secondary" @click="$emit('close')">
        Close
      </button>
    </div>

    <div class="viewer-content">
      <div v-if="document.summary" class="summary-section">
        <h4>Summary</h4>
        <p>{{ document.summary }}</p>
      </div>

      <div class="text-section">
        <h4>Full Text</h4>
        <div class="document-text">{{ document.raw_text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Document } from '@/types/documents';

interface Props {
  document: Document;
}

interface Emits {
  (e: 'close'): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<style scoped>
.document-viewer {
  max-width: 100%;
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1rem;
}

.viewer-title {
  font-size: 1.25rem;
  margin: 0;
  flex: 1;
}

.viewer-content {
  max-height: 600px;
  overflow-y: auto;
}

.summary-section,
.text-section {
  margin-bottom: 1.5rem;
}

.summary-section h4,
.text-section h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.summary-section p {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.document-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--color-text-secondary);
  line-height: 1.8;
  font-size: 0.875rem;
}
</style>
