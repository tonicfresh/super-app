import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { moduleDefinition } from "./module";

// Standalone-Modus: Eigene Vue-App
const app = createApp({
  template: '<router-view />',
});

const router = createRouter({
  history: createWebHistory(),
  routes: moduleDefinition.routes.map((r) => ({
    path: r.path,
    component: r.component,
  })),
});

app.use(createPinia());
app.use(router);
app.use(PrimeVue, { /* Volt theme config */ });

app.mount("#app");
