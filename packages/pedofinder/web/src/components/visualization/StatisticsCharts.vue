<template>
  <div class="statistics-charts">
    <!-- Top People Bar Chart -->
    <div class="card chart-card">
      <h3 class="card-title">Top 20 Most Mentioned People</h3>
      <v-chart
        class="chart-container"
        :option="topPeopleOption"
        autoresize
      />
    </div>

    <!-- Entity Distribution Pie Chart -->
    <div class="card chart-card">
      <h3 class="card-title">Entity Type Distribution</h3>
      <v-chart
        class="chart-container"
        :option="entityDistributionOption"
        autoresize
      />
    </div>

    <!-- Document Timeline -->
    <div class="card chart-card">
      <h3 class="card-title">Document Processing Timeline</h3>
      <v-chart
        class="chart-container"
        :option="timelineOption"
        autoresize
      />
    </div>

    <!-- Processing Status Pie Chart -->
    <div class="card chart-card">
      <h3 class="card-title">Processing Status</h3>
      <v-chart
        class="chart-container"
        :option="processingStatusOption"
        autoresize
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StatisticsData } from '@/types/api';
import type { EChartsOption } from 'echarts';

interface Props {
  data: StatisticsData;
}

const props = defineProps<Props>();

const topPeopleOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    textStyle: {
      color: '#f1f5f9',
    },
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  xAxis: {
    type: 'value',
    axisLabel: {
      color: '#cbd5e1',
    },
    splitLine: {
      lineStyle: {
        color: '#334155',
      },
    },
  },
  yAxis: {
    type: 'category',
    data: props.data.topPeople.map(p => p.name).reverse(),
    axisLabel: {
      color: '#cbd5e1',
      fontSize: 11,
    },
  },
  series: [
    {
      name: 'Mentions',
      type: 'bar',
      data: props.data.topPeople.map(p => p.mentionCount).reverse(),
      itemStyle: {
        color: '#8b5cf6',
        borderRadius: [0, 4, 4, 0],
      },
      emphasis: {
        itemStyle: {
          color: '#a78bfa',
        },
      },
      label: {
        show: true,
        position: 'right',
        color: '#f1f5f9',
        fontSize: 11,
      },
    },
  ],
}));

const entityDistributionOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)',
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    textStyle: {
      color: '#f1f5f9',
    },
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    textStyle: {
      color: '#cbd5e1',
    },
  },
  series: [
    {
      name: 'Entities',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#0f172a',
        borderWidth: 2,
      },
      label: {
        show: true,
        formatter: '{b}\n{d}%',
        color: '#f1f5f9',
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      data: [
        {
          value: props.data.entityDistribution.people,
          name: 'People',
          itemStyle: { color: '#8b5cf6' },
        },
        {
          value: props.data.entityDistribution.organizations,
          name: 'Organizations',
          itemStyle: { color: '#f59e0b' },
        },
        {
          value: props.data.entityDistribution.locations,
          name: 'Locations',
          itemStyle: { color: '#10b981' },
        },
        {
          value: props.data.entityDistribution.dates,
          name: 'Dates',
          itemStyle: { color: '#06b6d4' },
        },
      ],
    },
  ],
}));

const timelineOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    textStyle: {
      color: '#f1f5f9',
    },
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: props.data.documentTimeline.map(d => d.date),
    axisLabel: {
      color: '#cbd5e1',
      rotate: 45,
    },
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      color: '#cbd5e1',
    },
    splitLine: {
      lineStyle: {
        color: '#334155',
      },
    },
  },
  series: [
    {
      name: 'Documents',
      type: 'line',
      data: props.data.documentTimeline.map(d => d.count),
      smooth: true,
      itemStyle: {
        color: '#3b82f6',
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
          ],
        },
      },
    },
  ],
}));

const processingStatusOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)',
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    textStyle: {
      color: '#f1f5f9',
    },
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    textStyle: {
      color: '#cbd5e1',
    },
  },
  series: [
    {
      name: 'Status',
      type: 'pie',
      radius: '60%',
      data: [
        {
          value: props.data.processingStatus.completed,
          name: 'Completed',
          itemStyle: { color: '#10b981' },
        },
        {
          value: props.data.processingStatus.processing,
          name: 'Processing',
          itemStyle: { color: '#3b82f6' },
        },
        {
          value: props.data.processingStatus.pending,
          name: 'Pending',
          itemStyle: { color: '#f59e0b' },
        },
        {
          value: props.data.processingStatus.failed,
          name: 'Failed',
          itemStyle: { color: '#ef4444' },
        },
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
      label: {
        color: '#f1f5f9',
      },
    },
  ],
}));
</script>

<style scoped>
.statistics-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
}

.chart-card {
  min-height: 400px;
}

.chart-container {
  width: 100%;
  height: 350px;
}

@media (max-width: 768px) {
  .statistics-charts {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 300px;
  }
}
</style>
