<template>
  <div class="timeline">
    <v-chart
      class="chart-container"
      :option="chartOption"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsOption } from 'echarts';

interface TimelineEvent {
  date: string;
  name: string;
  value: number;
}

interface Props {
  events: TimelineEvent[];
}

const props = defineProps<Props>();

const chartOption = computed<EChartsOption>(() => ({
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
    type: 'time',
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
  series: [{
    name: 'Events',
    type: 'scatter',
    symbolSize: (val: any) => Math.sqrt(val[2]) * 5 + 5,
    data: props.events.map(e => [e.date, e.value, e.value]),
    itemStyle: {
      color: '#3b82f6',
      opacity: 0.8,
    },
    emphasis: {
      itemStyle: {
        color: '#60a5fa',
        borderColor: '#fff',
        borderWidth: 2,
      },
    },
  }],
}));
</script>

<style scoped>
.timeline {
  width: 100%;
  height: 400px;
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>
