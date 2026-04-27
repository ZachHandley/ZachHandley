import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('./views/Home.vue'),
    meta: {
      title: 'Search - Pedofinder',
    },
  },
  {
    path: '/graph',
    name: 'Graph',
    component: () => import('./views/GraphView.vue'),
    meta: {
      title: 'Network Graph - Pedofinder',
    },
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('./views/Statistics.vue'),
    meta: {
      title: 'Statistics - Pedofinder',
    },
  },
  {
    path: '/entity/:type/:id',
    name: 'Entity',
    component: () => import('./views/EntityView.vue'),
    meta: {
      title: 'Entity Profile - Pedofinder',
    },
    props: true,
  },
  {
    path: '/document/:id',
    name: 'Document',
    component: () => import('./views/DocumentView.vue'),
    meta: {
      title: 'Document - Pedofinder',
    },
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// Update document title on route change
router.beforeEach((to, from, next) => {
  const title = to.meta.title as string || 'Pedofinder';
  document.title = title;
  next();
});

export default router;
