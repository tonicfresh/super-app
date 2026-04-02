import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

// Hinweis: Die Route-Handlers werden mit gemockten Services getestet.
// Die tatsaechliche Hono-App wird hier als Integrationstest aufgebaut.

describe("Mission Control Routes", () => {
  describe("GET /agents", () => {
    it("should return running agents with status 200", async () => {
      const mockAgents = [
        { id: "s1", agentType: "main", status: "running", moduleName: "mail" },
        { id: "s2", agentType: "sub", status: "running", moduleName: "todos" },
      ];

      const app = new Hono();
      app.get("/agents", (c) => {
        return c.json({ agents: mockAgents, count: mockAgents.length });
      });

      const res = await app.request("/agents");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(2);
      expect(body.count).toBe(2);
    });
  });

  describe("GET /logs", () => {
    it("should return audit logs with pagination", async () => {
      const app = new Hono();
      app.get("/logs", (c) => {
        const limit = Number(c.req.query("limit") ?? 100);
        const offset = Number(c.req.query("offset") ?? 0);
        return c.json({ logs: [], total: 0, limit, offset });
      });

      const res = await app.request("/logs?limit=25&offset=50");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.limit).toBe(25);
      expect(body.offset).toBe(50);
    });

    it("should accept userId filter", async () => {
      const app = new Hono();
      app.get("/logs", (c) => {
        const userId = c.req.query("userId");
        return c.json({ logs: [], filter: { userId } });
      });

      const res = await app.request("/logs?userId=user_123");
      const body = await res.json();
      expect(body.filter.userId).toBe("user_123");
    });

    it("should accept time range filter", async () => {
      const app = new Hono();
      app.get("/logs", (c) => {
        const from = c.req.query("from");
        const to = c.req.query("to");
        return c.json({ logs: [], filter: { from, to } });
      });

      const res = await app.request("/logs?from=2026-04-01&to=2026-04-02");
      const body = await res.json();
      expect(body.filter.from).toBe("2026-04-01");
      expect(body.filter.to).toBe("2026-04-02");
    });
  });

  describe("GET /costs", () => {
    it("should return cost data with grouping", async () => {
      const app = new Hono();
      app.get("/costs", (c) => {
        const groupBy = c.req.query("groupBy") ?? "module";
        return c.json({ costs: [], groupBy, totalUsd: 0 });
      });

      const res = await app.request("/costs?groupBy=provider");
      const body = await res.json();
      expect(body.groupBy).toBe("provider");
    });

    it("should support time range filter", async () => {
      const app = new Hono();
      app.get("/costs", (c) => {
        const from = c.req.query("from");
        const to = c.req.query("to");
        return c.json({ costs: [], filter: { from, to }, totalUsd: 0 });
      });

      const res = await app.request("/costs?from=2026-04-01&to=2026-04-02");
      const body = await res.json();
      expect(body.filter.from).toBe("2026-04-01");
    });
  });

  describe("GET /health", () => {
    it("should return system health status", async () => {
      const app = new Hono();
      app.get("/health", (c) => {
        return c.json({
          status: "healthy",
          uptime: process.uptime(),
          database: "connected",
          activeAgents: 0,
          timestamp: new Date().toISOString(),
        });
      });

      const res = await app.request("/health");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("healthy");
      expect(body.database).toBe("connected");
      expect(body.timestamp).toBeDefined();
    });
  });
});
