<template>
  <div class="entity-profile card">
    <div class="profile-header">
      <h2 class="profile-name">{{ entity.name }}</h2>
      <span :class="`badge badge-${entity.entity_type}`">
        {{ entity.entity_type }}
      </span>
    </div>

    <div class="profile-stats">
      <div class="stat">
        <span class="stat-value">{{ entity.mention_count }}</span>
        <span class="stat-label">Mentions</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ entity.document_ids.length }}</span>
        <span class="stat-label">Documents</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ (entity.confidence * 100).toFixed(0) }}%</span>
        <span class="stat-label">Confidence</span>
      </div>
    </div>

    <div v-if="entity.entity_type === 'person' && 'aliases' in entity" class="profile-section">
      <h3 class="section-title">Aliases</h3>
      <div class="aliases">
        <span v-for="alias in entity.aliases" :key="alias" class="badge badge-secondary">
          {{ alias }}
        </span>
      </div>
    </div>

    <div v-if="entity.related_entities.length > 0" class="profile-section">
      <h3 class="section-title">Top Related Entities</h3>
      <div class="related-list">
        <div
          v-for="rel in entity.related_entities.slice(0, 5)"
          :key="rel.entity_id"
          class="related-item"
        >
          <span :class="`badge badge-${rel.entity_type}`">{{ rel.entity_type }}</span>
          <span class="related-count">{{ rel.co_occurrence_count }}</span>
        </div>
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
.entity-profile {
  padding: 1.5rem;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.profile-name {
  font-size: 1.5rem;
  margin: 0;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.profile-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.aliases {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.related-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--color-bg-tertiary);
  border-radius: 0.25rem;
}

.related-count {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.badge-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}
</style>
