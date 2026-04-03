# Requirements: Super App Audit & Stabilisierung

**Defined:** 2026-04-02
**Core Value:** Bestehende Codebase solide, konsistent und bereit fuer geplante Features machen

## v1 Requirements

### Security (CRITICAL)

- [ ] **SEC-01**: Permission-Middleware reaktivieren — aktuell komplett deaktiviert (HACK)
- [ ] **SEC-02**: Hanko Token Verification mit Fallback Error Handling ausstatten
- [ ] **SEC-03**: AI Tool Approval Workflow DB-Storage implementieren (aktuell gestubbt)
- [ ] **SEC-04**: Privacy ID-Enumeration-Schutz (Rate Limiting, ID-Obscuration)

### AI System Stabilisierung

- [ ] **AI-01**: getSecret/getSetting an Framework-Secrets anbinden (aktuell return null)
- [ ] **AI-02**: dbInsert fuer Cost-Logging an Drizzle anbinden (aktuell no-op)
- [ ] **AI-03**: checkModuleAccess gegen Permissions-Tabelle implementieren (aktuell always true)
- [ ] **AI-04**: Model-Selection aus Provider-Registry laden (aktuell null as any)
- [ ] **AI-05**: Agent Step Tracking und Approval Requests in DB loggen (aktuell no-op)
- [ ] **AI-06**: Cost-Pricing-Tabelle aus Settings laden statt hardcoded
- [ ] **AI-07**: queryDailyTotal/queryModuleDaily Caching implementieren

### Type Safety

- [x] **TYPE-01**: LanguageModel Interface in @super-app/shared definieren und exportieren
- [x] **TYPE-02**: Alle 11 `as any` Assertions durch korrekte Typen ersetzen
- [x] **TYPE-03**: Module Registry Plugin-Validation bei Registrierung

### Spec-Abgleich (IST vs. SOLL)

- [ ] **SPEC-01**: Phase 1 (Shared Core) gegen tatsaechlichen shared/ Code abgleichen
- [ ] **SPEC-02**: Phase 2 (Auth & Security) gegen auth/ Code abgleichen
- [ ] **SPEC-03**: Phase 3 (AI Agent System) gegen ai/ Code abgleichen
- [ ] **SPEC-04**: Phase 4 (AI Providers & Cost) gegen providers/cost-tracking Code abgleichen
- [ ] **SPEC-05**: Phase 5 (Mission Control) gegen mission-control Modul abgleichen
- [ ] **SPEC-06**: Phase 6 (PWA & Push) gegen push/PWA Code abgleichen
- [ ] **SPEC-07**: Phase 7 (Theming) gegen themes/ Code abgleichen
- [ ] **SPEC-08**: Phase 8 (Todos) gegen todos Modul abgleichen

### Testing

- [ ] **TEST-01**: E2E Module Integration Tests (Registry -> Agent -> Tool -> Permission)
- [ ] **TEST-02**: Hanko Auth Flow Tests (Token, Cache, Expiry)
- [ ] **TEST-03**: Cost Guardrail Enforcement Integration Tests
- [ ] **TEST-04**: Privacy System Integration Tests

### Konsistenz

- [x] **CON-01**: Backend/Frontend package.json Versionen synchronisieren
- [x] **CON-02**: Drizzle Schema Table-Prefix Enforcement validieren
- [ ] **CON-03**: CLAUDE.md gegen tatsaechlichen Code-Stand aktualisieren

## v2 Requirements

### Performance

- **PERF-01**: Redis TTL fuer Token-Cache optimieren
- **PERF-02**: Read Replicas fuer Analytics-Queries evaluieren
- **PERF-03**: Cost Guardrail Caching mit Redis statt DB-Query pro Call

### Skalierung

- **SCALE-01**: Per-Tenant Guardrail Configuration
- **SCALE-02**: Parallel Tool Execution im AI Agent
- **SCALE-03**: Notification System (WebSocket + Push)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Neue Module entwickeln | Erst stabilisieren, dann erweitern |
| ai-proxy Integration | Separates Projekt, eigenes Repo |
| Playwright E2E Tests | Zu aufwaendig fuer diesen Milestone |
| Framework-Submodule aendern | Gehoert nicht zur Super-App |
| CI/CD Pipeline | Fokus auf Code-Qualitaet |

## Traceability

| Requirement | Phase | Phase Name | Status |
|-------------|-------|------------|--------|
| TYPE-01 | Phase 1 | Type Safety & Consistency | Pending |
| TYPE-02 | Phase 1 | Type Safety & Consistency | Pending |
| TYPE-03 | Phase 1 | Type Safety & Consistency | Pending |
| CON-01 | Phase 1 | Type Safety & Consistency | Pending |
| CON-02 | Phase 1 | Type Safety & Consistency | Pending |
| SEC-01 | Phase 2 | Security & AI Stubs | Pending |
| SEC-02 | Phase 2 | Security & AI Stubs | Pending |
| AI-01 | Phase 2 | Security & AI Stubs | Pending |
| AI-02 | Phase 2 | Security & AI Stubs | Pending |
| AI-03 | Phase 2 | Security & AI Stubs | Pending |
| AI-04 | Phase 2 | Security & AI Stubs | Pending |
| AI-06 | Phase 2 | Security & AI Stubs | Pending |
| AI-07 | Phase 2 | Security & AI Stubs | Pending |
| SEC-03 | Phase 3 | AI System Completion | Pending |
| SEC-04 | Phase 3 | AI System Completion | Pending |
| AI-05 | Phase 3 | AI System Completion | Pending |
| SPEC-01 | Phase 4 | Spec Audit | Pending |
| SPEC-02 | Phase 4 | Spec Audit | Pending |
| SPEC-03 | Phase 4 | Spec Audit | Pending |
| SPEC-04 | Phase 4 | Spec Audit | Pending |
| SPEC-05 | Phase 4 | Spec Audit | Pending |
| SPEC-06 | Phase 4 | Spec Audit | Pending |
| SPEC-07 | Phase 4 | Spec Audit | Pending |
| SPEC-08 | Phase 4 | Spec Audit | Pending |
| TEST-01 | Phase 5 | Test Coverage & Documentation | Pending |
| TEST-02 | Phase 5 | Test Coverage & Documentation | Pending |
| TEST-03 | Phase 5 | Test Coverage & Documentation | Pending |
| TEST-04 | Phase 5 | Test Coverage & Documentation | Pending |
| CON-03 | Phase 5 | Test Coverage & Documentation | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after roadmap creation*
