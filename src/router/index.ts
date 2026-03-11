import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/station/:id",
      name: "station-detail",
      component: () => import("@/views/StationDetailView.vue"),
      props: true,
    },
  ],
  scrollBehavior() {
    return { top: 0, behavior: "smooth" };
  },
});

export default router;
