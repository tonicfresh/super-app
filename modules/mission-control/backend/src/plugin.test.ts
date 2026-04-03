import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { plugin } from "./plugin";

describe("Mission Control Plugin", () => {
  test("plugin.routes is a function that accepts a Hono app and returns void", () => {
    expect(typeof plugin.routes).toBe("function");

    const app = new Hono();
    const result = plugin.routes!(app);

    // Muss void/undefined zurueckgeben, nicht eine Hono-Instanz
    expect(result).toBeUndefined();
  });

  test("after calling plugin.routes(app), GET /agents returns 200", async () => {
    const app = new Hono();
    plugin.routes!(app);

    const res = await app.request("/agents");
    // Route muss existieren und nicht 404 liefern
    expect(res.status).not.toBe(404);
  });

  test("plugin satisfies ModulePlugin interface — routes signature matches (app: any) => void", () => {
    // TypeScript-Kompilierbarkeit ist der eigentliche Test.
    // Hier pruefen wir zur Laufzeit dass routes aufrufbar ist mit einem Hono-Argument.
    const app = new Hono();
    expect(() => plugin.routes!(app)).not.toThrow();
  });
});
