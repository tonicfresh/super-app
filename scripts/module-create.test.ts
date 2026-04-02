import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { rmSync, existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

// Hilfsfunktion: Script ausfuehren
async function runModuleCreate(name: string, cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "run", join(import.meta.dir, "module-create.ts"), name], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

const TEST_DIR = join(import.meta.dir, "..", "__test-modules__");
const MODULES_DIR = join(TEST_DIR, "modules");

describe("module:create script", () => {
  beforeEach(() => {
    mkdirSync(MODULES_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should fail without a module name argument", async () => {
    const result = await runModuleCreate("", TEST_DIR);
    expect(result.stderr || result.stdout).toContain("module name");
  });

  it("should fail with invalid module name (uppercase)", async () => {
    const result = await runModuleCreate("MyModule", TEST_DIR);
    expect(result.stderr || result.stdout).toContain("lowercase");
  });

  it("should fail with invalid module name (special chars)", async () => {
    const result = await runModuleCreate("my_module!", TEST_DIR);
    expect(result.stderr || result.stdout).toContain("lowercase");
  });

  it("should create correct directory structure", async () => {
    // Setze MODULES_PATH env damit das Script ins richtige Verzeichnis schreibt
    process.env.SUPER_APP_MODULES_PATH = MODULES_DIR;
    const result = await runModuleCreate("contacts", TEST_DIR);

    const base = join(MODULES_DIR, "contacts");
    expect(existsSync(join(base, "backend", "src", "index.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "plugin.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "tools.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "db", "schema.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "routes", "index.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "jobs", "index.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "services", "index.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "tests", "routes.test.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "tests", "tools.test.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "tests", "schema.test.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "tests", "security.test.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "package.json"))).toBe(true);
    expect(existsSync(join(base, "frontend", "src", "main.ts"))).toBe(true);
    expect(existsSync(join(base, "frontend", "src", "module.ts"))).toBe(true);
    expect(existsSync(join(base, "frontend", "src", "views", ".gitkeep"))).toBe(true);
    expect(existsSync(join(base, "frontend", "src", "components", ".gitkeep"))).toBe(true);
    expect(existsSync(join(base, "frontend", "src", "stores", ".gitkeep"))).toBe(true);
    expect(existsSync(join(base, "frontend", "package.json"))).toBe(true);
    expect(existsSync(join(base, "README.md"))).toBe(true);
    expect(existsSync(join(base, "AGENTS.md"))).toBe(true);

    delete process.env.SUPER_APP_MODULES_PATH;
  });

  it("should use correct module name in generated files", async () => {
    process.env.SUPER_APP_MODULES_PATH = MODULES_DIR;
    await runModuleCreate("contacts", TEST_DIR);

    const pluginTs = readFileSync(
      join(MODULES_DIR, "contacts", "backend", "src", "plugin.ts"),
      "utf-8"
    );
    expect(pluginTs).toContain('name: "contacts"');

    const moduleTs = readFileSync(
      join(MODULES_DIR, "contacts", "frontend", "src", "module.ts"),
      "utf-8"
    );
    expect(moduleTs).toContain('name: "contacts"');

    const schemaTs = readFileSync(
      join(MODULES_DIR, "contacts", "backend", "src", "db", "schema.ts"),
      "utf-8"
    );
    expect(schemaTs).toContain("contacts_");

    const agentsMd = readFileSync(
      join(MODULES_DIR, "contacts", "AGENTS.md"),
      "utf-8"
    );
    expect(agentsMd).toContain("contacts");

    delete process.env.SUPER_APP_MODULES_PATH;
  });

  it("should fail if module directory already exists", async () => {
    process.env.SUPER_APP_MODULES_PATH = MODULES_DIR;
    mkdirSync(join(MODULES_DIR, "contacts"), { recursive: true });

    const result = await runModuleCreate("contacts", TEST_DIR);
    expect(result.stderr || result.stdout).toContain("already exists");

    delete process.env.SUPER_APP_MODULES_PATH;
  });

  it("should accept hyphenated module names", async () => {
    process.env.SUPER_APP_MODULES_PATH = MODULES_DIR;
    const result = await runModuleCreate("knowledge-base", TEST_DIR);

    const base = join(MODULES_DIR, "knowledge-base");
    expect(existsSync(join(base, "backend", "src", "plugin.ts"))).toBe(true);

    const pluginTs = readFileSync(
      join(base, "backend", "src", "plugin.ts"),
      "utf-8"
    );
    expect(pluginTs).toContain('name: "knowledge-base"');

    // Schema-Prefix: Bindestriche werden zu Unterstrichen
    const schemaTs = readFileSync(
      join(base, "backend", "src", "db", "schema.ts"),
      "utf-8"
    );
    expect(schemaTs).toContain("kb_");

    delete process.env.SUPER_APP_MODULES_PATH;
  });
});
