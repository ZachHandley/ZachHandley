<template>
  <div class="network-graph">
    <div v-if="isLoading" class="loading-container">
      <div class="loading"></div>
      <p>Loading network graph...</p>
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="chart-wrapper">
      <v-chart
        ref="chartRef"
        class="chart-container"
        :option="chartOption"
        autoresize
        @click="handleNodeClick"
      />

      <div class="graph-controls">
        <button class="btn btn-sm btn-secondary" @click="resetZoom">
          Reset Zoom
        </button>
        <button class="btn btn-sm btn-secondary" @click="refreshLayout">
          Refresh Layout
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { NetworkGraphData, NetworkNode, NetworkEdge, EntityType } from '@/types/entities';
import type { EChartsOption } from 'echarts';

interface Props {
  data: NetworkGraphData;
  isLoading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  error: null,
});

const router = useRouter();
const chartRef = ref();

const entityColors: Record<string, string> = {
  person: '#8b5cf6',
  org: '#f59e0b',
  location: '#10b981',
  date: '#06b6d4',
};

const chartOption = computed<EChartsOption>(() => {
  if (!props.data || props.data.nodes.length === 0) {
    return {};
  }

  return {
    title: {
      text: 'Entity Relationship Network',
      left: 'center',
      textStyle: {
        color: '#f1f5f9',
        fontSize: 18,
      },
    },
    tooltip: {
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = params.data;
          return `
            <strong>${node.name}</strong><br/>
            Type: ${node.type}<br/>
            Mentions: ${node.value}
          `;
        } else if (params.dataType === 'edge') {
          const edge = params.data;
          return `
            Co-occurrences: ${edge.value}
          `;
        }
        return '';
      },
      backgroundColor: '#1e293b',
      borderColor: '#475569',
      textStyle: {
        color: '#f1f5f9',
      },
    },
    legend: {
      data: props.data.categories.map(c => c.name),
      orient: 'vertical',
      left: 'left',
      top: '60',
      textStyle: {
        color: '#cbd5e1',
      },
      formatter: (name: string) => {
        const count = props.data.nodes.filter(n => n.type === name).length;
        return `${name} (${count})`;
      },
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        data: props.data.nodes.map(node => ({
          ...node,
          itemStyle: {
            color: entityColors[node.type] || '#94a3b8',
          },
        })),
        links: props.data.edges,
        categories: props.data.categories,
        roam: true,
        label: {
          show: true,
          position: 'right',
          formatter: '{b}',
          fontSize: 12,
          color: '#f1f5f9',
        },
        labelLayout: {
          hideOverlap: true,
        },
        scaleLimit: {
          min: 0.4,
          max: 3,
        },
        lineStyle: {
          color: 'source',
          curveness: 0.3,
          opacity: 0.5,
        },
        emphasis: {
          focus: 'adjacency',
          label: {
            fontSize: 14,
            fontWeight: 'bold',
          },
          lineStyle: {
            width: 3,
            opacity: 0.8,
          },
        },
        force: {
          repulsion: 200,
          edgeLength: [50, 150],
          gravity: 0.1,
          friction: 0.6,
          layoutAnimation: true,
        },
      },
    ],
  };
});

function handleNodeClick(params: any) {
  if (params.dataType === 'node') {
    const node = params.data as NetworkNode;
    router.push(`/entity/${node.type}/${node.id}`);
  }
}

function resetZoom() {
  if (chartRef.value) {
    const chart = chartRef.value.chart;
    chart.dispatchAction({
      type: 'restore',
    });
  }
}

function refreshLayout() {
  if (chartRef.value) {
    const chart = chartRef.value.chart;
    chart.setOption(chartOption.value, true);
  }
}

// Auto-refresh when data changes
watch(() => props.data, () => {
  if (chartRef.value) {
    refreshLayout();
  }
}, { deep: true });
</script>

<style scoped>
.network-graph {
  width: 100%;
  position: relative;
}

.chart-wrapper {
  position: relative;
}

.chart-container {
  width: 100%;
  height: 700px;
}

.graph-controls {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  z-index: 10;
}

@media (max-width: 768px) {
  .chart-container {
    height: 500px;
  }

  .graph-controls {
    flex-direction: column;
  }
}
</style>
