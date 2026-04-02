/**
 * Todos Module — Standalone Frontend
 *
 * Startet eine eigenstaendige Vue-App fuer das Todos-Modul.
 * Im integrierten Modus wird stattdessen module.ts verwendet.
 */

import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import PrimeVue from "primevue/config";

// Views
import TodoList from "./views/TodoList.vue";
import TodoDetail from "./views/TodoDetail.vue";
import TodoSettings from "./views/TodoSettings.vue";

// Router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/todos" },
    { path: "/todos", component: TodoList },
    { path: "/todos/settings", component: TodoSettings },
    { path: "/todos/:id", component: TodoDetail },
  ],
});

// App
const app = createApp({
  template: "<router-view />",
});

app.use(createPinia());
app.use(router);
app.use(PrimeVue, { /* Volt theme config */ });

app.mount("#app");
