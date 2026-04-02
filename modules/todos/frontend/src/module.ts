import type { ModuleDefinition } from "@super-app/shared";

// ============================================================
// Todos Module — Frontend Contract (module.ts)
//
// Dieses File ist der INTEGRIERTE Einstiegspunkt fuer das Frontend.
// Es definiert Routes, Navigation und erforderliche Permissions.
// Der module-loader.ts der Super App liest diese Definition.
// ============================================================

export const moduleDefinition: ModuleDefinition = {
  name: "todos",
  routes: [
    {
      path: "/todos",
      component: () => import("./views/TodoList.vue"),
    },
    {
      path: "/todos/:id",
      component: () => import("./views/TodoDetail.vue"),
    },
    {
      path: "/todos/settings",
      component: () => import("./views/TodoSettings.vue"),
    },
  ],
  navigation: {
    label: "Todos",
    icon: "i-heroicons-check-circle",
    position: "sidebar",
    order: 20,
  },
  permissions: ["todos:read"],
};
