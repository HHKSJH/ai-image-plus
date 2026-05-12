import { createRouter, createWebHashHistory } from "vue-router";
import StudioLayoutView from "../views/studio/StudioLayoutView.vue";

const routes = [
  {
    path: "/",
    redirect: "/generate"
  },
  {
    path: "/generate",
    name: "generate",
    component: StudioLayoutView,
    meta: {
      mode: "generate"
    }
  },
  {
    path: "/edit",
    name: "edit",
    component: StudioLayoutView,
    meta: {
      mode: "edit"
    }
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/generate"
  }
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});
