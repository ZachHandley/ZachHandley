<template>
  <div class="page statistics-page">
    <div class="container">
      <header class="page-header">
        <h1>Statistics Dashboard</h1>
        <p class="page-description">
          Overview of document processing, entity extraction, and data analytics.
        </p>
      </header>

      <div v-if="isLoading" class="loading-container">
        <div class="loading"></div>
        <p>Loading statistics...</p>
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <div v-else>
        <div class="stats-summary">
          <div class="stat-card card">
            <div class="stat-icon">📄</div>
            <div class="stat-value">{{ statistics.totalDocuments }}</div>
            <div class="stat-label">Total Documents</div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon">👥</div>
            <div class="stat-value">{{ statistics.totalEntities.people }}</div>
            <div class="stat-label">People</div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon">🏢</div>
            <div class="stat-value">{{ statistics.totalEntities.organizations }}</div>
            <div class="stat-label">Organizations</div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon">📍</div>
            <div class="stat-value">{{ statistics.totalEntities.locations }}</div>
            <div class="stat-label">Locations</div>
          </div>
        </div>

        <StatisticsCharts :data="statistics" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import StatisticsCharts from '@/components/visualization/StatisticsCharts.vue';
import { documentsApi, peopleApi, organizationsApi, locationsApi, datesApi } from '@/services/appwrite';
import type { StatisticsData } from '@/types/api';

const isLoading = ref(false);
const error = ref<string | null>(null);

const statistics = ref<StatisticsData>({
  totalDocuments: 0,
  totalEntities: {
    people: 0,
    organizations: 0,
    locations: 0,
    dates: 0,
  },
  topPeople: [],
  topOrganizations: [],
  topLocations: [],
  documentTimeline: [],
  entityDistribution: {
    people: 0,
    organizations: 0,
    locations: 0,
    dates: 0,
  },
  processingStatus: {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  },
});

onMounted(async () => {
  await loadStatistics();
});

async function loadStatistics() {
  isLoading.value = true;
  error.value = null;

  try {
    const [
      docsResult,
      peopleResult,
      orgsResult,
      locationsResult,
      datesResult,
      topPeople,
      topOrgs,
      topLocations,
      completedDocs,
      processingDocs,
      pendingDocs,
      failedDocs,
    ] = await Promise.all([
      documentsApi.list({ limit: 1 }),
      peopleApi.list({ limit: 1 }),
      organizationsApi.list({ limit: 1 }),
      locationsApi.list({ limit: 1 }),
      datesApi.list({ limit: 1 }),
      peopleApi.getTopByMentions(20),
      organizationsApi.getTopByMentions(20),
      locationsApi.getTopByMentions(20),
      documentsApi.getByStatus('completed', { limit: 1 }),
      documentsApi.getByStatus('processing', { limit: 1 }),
      documentsApi.getByStatus('pending', { limit: 1 }),
      documentsApi.getByStatus('failed', { limit: 1 }),
    ]);

    statistics.value = {
      totalDocuments: docsResult.total,
      totalEntities: {
        people: peopleResult.total,
        organizations: orgsResult.total,
        locations: locationsResult.total,
        dates: datesResult.total,
      },
      topPeople: topPeople.map(p => ({
        id: p.$id,
        name: p.name,
        mentionCount: p.mention_count,
      })),
      topOrganizations: topOrgs.map(o => ({
        id: o.$id,
        name: o.name,
        mentionCount: o.mention_count,
      })),
      topLocations: topLocations.map(l => ({
        id: l.$id,
        name: l.name,
        mentionCount: l.mention_count,
      })),
      documentTimeline: generateMockTimeline(),
      entityDistribution: {
        people: peopleResult.total,
        organizations: orgsResult.total,
        locations: locationsResult.total,
        dates: datesResult.total,
      },
      processingStatus: {
        completed: completedDocs.total,
        processing: processingDocs.total,
        pending: pendingDocs.total,
        failed: failedDocs.total,
      },
    };
  } catch (err: any) {
    error.value = err.message || 'Failed to load statistics';
  } finally {
    isLoading.value = false;
  }
}

function generateMockTimeline() {
  const timeline = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    timeline.push({
      date: date.toISOString().split('T')[0] || '',
      count: Math.floor(Math.random() * 10) + 1,
    });
  }
  return timeline;
}
</script>

<style scoped>
.statistics-page {
  padding: 2rem 0 4rem;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-description {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  max-width: 700px;
  margin: 0 auto;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-card {
  text-align: center;
  padding: 2rem 1rem;
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 1rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
