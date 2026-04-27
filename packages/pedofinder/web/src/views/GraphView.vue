<template>
  <div class="page graph-page">
    <div class="container">
      <header class="page-header">
        <h1>Entity Relationship Network</h1>
        <p class="page-description">
          Interactive network visualization showing connections between people, organizations, and locations.
        </p>
      </header>

      <div v-if="isLoading" class="loading-container">
        <div class="loading"></div>
        <p>Building network graph...</p>
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <NetworkGraph
        v-else
        :data="graphData"
        :is-loading="isLoading"
        :error="error"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import NetworkGraph from '@/components/visualization/NetworkGraph.vue';
import { peopleApi, organizationsApi, locationsApi } from '@/services/appwrite';
import type { NetworkGraphData, NetworkNode, NetworkEdge, EntityType } from '@/types/entities';

const isLoading = ref(false);
const error = ref<string | null>(null);
const graphData = ref<NetworkGraphData>({
  nodes: [],
  edges: [],
  categories: [
    { name: 'person' },
    { name: 'org' },
    { name: 'location' },
  ],
});

onMounted(async () => {
  await loadGraphData();
});

async function loadGraphData() {
  isLoading.value = true;
  error.value = null;

  try {
    const [people, orgs, locations] = await Promise.all([
      peopleApi.getTopByMentions(50),
      organizationsApi.getTopByMentions(30),
      locationsApi.getTopByMentions(20),
    ]);

    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    const edgeMap = new Map<string, number>();

    // Add people nodes
    people.forEach((person, idx) => {
      nodes.push({
        id: person.$id,
        name: person.name,
        type: 'person' as EntityType,
        mentionCount: person.mention_count,
        category: 0,
        symbolSize: Math.sqrt(person.mention_count) * 3 + 10,
        value: person.mention_count,
      });

      // Add edges from related entities
      person.related_entities.forEach(rel => {
        const edgeKey = [person.$id, rel.entity_id].sort().join('-');
        edgeMap.set(edgeKey, (edgeMap.get(edgeKey) || 0) + rel.co_occurrence_count);
      });
    });

    // Add org nodes
    orgs.forEach(org => {
      nodes.push({
        id: org.$id,
        name: org.name,
        type: 'org' as EntityType,
        mentionCount: org.mention_count,
        category: 1,
        symbolSize: Math.sqrt(org.mention_count) * 3 + 10,
        value: org.mention_count,
      });

      org.related_entities.forEach(rel => {
        const edgeKey = [org.$id, rel.entity_id].sort().join('-');
        edgeMap.set(edgeKey, (edgeMap.get(edgeKey) || 0) + rel.co_occurrence_count);
      });
    });

    // Add location nodes
    locations.forEach(loc => {
      nodes.push({
        id: loc.$id,
        name: loc.name,
        type: 'location' as EntityType,
        mentionCount: loc.mention_count,
        category: 2,
        symbolSize: Math.sqrt(loc.mention_count) * 3 + 10,
        value: loc.mention_count,
      });

      loc.related_entities.forEach(rel => {
        const edgeKey = [loc.$id, rel.entity_id].sort().join('-');
        edgeMap.set(edgeKey, (edgeMap.get(edgeKey) || 0) + rel.co_occurrence_count);
      });
    });

    // Create edges
    const nodeIds = new Set(nodes.map(n => n.id));
    edgeMap.forEach((count, edgeKey) => {
      const [source, target] = edgeKey.split('-');
      if (nodeIds.has(source) && nodeIds.has(target) && count > 2) {
        edges.push({
          source,
          target,
          value: count,
          lineStyle: {
            width: Math.min(count / 5, 5),
            opacity: Math.min(count / 20, 0.8),
          },
        });
      }
    });

    graphData.value = { nodes, edges, categories: graphData.value.categories };
  } catch (err: any) {
    error.value = err.message || 'Failed to load graph data';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.graph-page {
  padding: 2rem 0 4rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-description {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  max-width: 700px;
  margin: 0 auto;
}
</style>
