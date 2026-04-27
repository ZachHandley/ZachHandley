import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Import ECharts components
import ECharts from 'vue-echarts';
import { use } from 'echarts/core';

// Import ECharts components
import {
  CanvasRenderer,
} from 'echarts/renderers';

import {
  GraphChart,
  BarChart,
  PieChart,
  LineChart,
  ScatterChart,
  HeatmapChart,
} from 'echarts/charts';

import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent,
  TimelineComponent,
} from 'echarts/components';

// Register ECharts components
use([
  CanvasRenderer,
  GraphChart,
  BarChart,
  PieChart,
  LineChart,
  ScatterChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent,
  TimelineComponent,
]);

const app = createApp(App);

app.use(router);
app.component('v-chart', ECharts);

app.mount('#app');
