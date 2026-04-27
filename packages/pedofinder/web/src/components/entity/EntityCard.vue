<template>
  <div
    class="entity-card card"
    @click="$router.push(`/entity/${entity.entity_type}/${entity.$id}`)"
  >
    <div class="entity-header">
      <span :class="`badge badge-${entity.entity_type}`">
        {{ entity.entity_type }}
      </span>
      <span class="entity-confidence">
        {{ (entity.confidence * 100).toFixed(0) }}%
      </span>
    </div>

    <h3 class="entity-name">{{ entity.name }}</h3>

    <div class="entity-stats">
      <div class="stat">
        <span class="stat-label">Mentions</span>
        <span class="stat-value">{{ entity.mention_count }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Documents</span>
        <span class="stat-value">{{ entity.document_ids.length }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Related</span>
        <span class="stat-value">{{ entity.related_entities.length }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Entity } from '@/types/entities';

interface Props {
  entity: Entity;
}

defineProps<Props>();
</script>

<style scoped>
.entity-card {
  cursor: pointer;
}

.entity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.entity-confidence {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.entity-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--color-text);
}

.entity-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary);
}
</style>
