import type { ModuleDefinition } from "@super-app/shared";

export const moduleDefinition: ModuleDefinition = {
  name: "mission-control",
  routes: [
    {
      path: "/mission-control",
      component: () => import("./views/Dashboard.vue"),
    },
    {
      path: "/mission-control/agents",
      component: () => import("./views/AgentMonitor.vue"),
    },
    {
      path: "/mission-control/logs",
      component: () => import("./views/LogViewer.vue"),
    },
    {
      path: "/mission-control/costs",
      component: () => import("./views/CostTracker.vue"),
    },
    {
      path: "/mission-control/audit",
      component: () => import("./views/AuditLog.vue"),
    },
  ],
  navigation: {
    label: "Mission Control",
    icon: "i-heroicons-command-line",
    position: "sidebar",
    order: 0, // Immer ganz oben — mandatory module
  },
  permissions: ["mc:read"],
};
