<template>
  <div class="word-cloud">
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

interface WordData {
  name: string;
  value: number;
}

interface Props {
  words: WordData[];
}

const props = defineProps<Props>();

const chartOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    show: true,
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    textStyle: {
      color: '#f1f5f9',
    },
  },
  series: [{
    type: 'wordCloud',
    gridSize: 8,
    sizeRange: [12, 60],
    rotationRange: [-90, 90],
    shape: 'circle',
    width: '100%',
    height: '100%',
    drawOutOfBound: false,
    textStyle: {
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      color: () => {
        const colors = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];
        return colors[Math.floor(Math.random() * colors.length)] || '#8b5cf6';
      },
    },
    emphasis: {
      textStyle: {
        shadowBlur: 10,
        shadowColor: '#333',
      },
    },
    data: props.words,
  }],
}));
</script>

<style scoped>
.word-cloud {
  width: 100%;
  height: 400px;
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>
