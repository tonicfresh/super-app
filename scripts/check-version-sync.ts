#!/usr/bin/env bun
/**
 * Validierungsscript: Prueft ob Backend und Frontend identische Versionen
 * fuer gemeinsame Dependencies verwenden.
 * Aufruf: bun run scripts/check-version-sync.ts
 * Exit 0 = alles synchron, Exit 1 = Mismatches gefunden
 */

import backendPkg from "../template/backend/package.json";
import frontendPkg from "../template/frontend/package.json";

const backendDeps: Record<string, string> = {
  ...((backendPkg as any).dependencies ?? {}),
  ...((backendPkg as any).devDependencies ?? {}),
};
const frontendDeps: Record<string, string> = {
  ...((frontendPkg as any).dependencies ?? {}),
  ...((frontendPkg as any).devDependencies ?? {}),
};

const mismatches: string[] = [];
for (const [name, beVersion] of Object.entries(backendDeps)) {
  const feVersion = frontendDeps[name];
  if (feVersion && beVersion !== feVersion) {
    mismatches.push(`  ${name}: backend=${beVersion}  frontend=${feVersion}`);
  }
}

if (mismatches.length > 0) {
  console.error("Version mismatches found between backend and frontend:");
  mismatches.forEach((m) => console.error(m));
  process.exit(1);
}

console.log("All shared dependency versions are in sync.");
process.exit(0);
