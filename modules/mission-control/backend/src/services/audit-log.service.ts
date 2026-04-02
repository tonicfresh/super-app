// --- Typen ---

export type AuditResult =
  | "granted"
  | "denied"
  | "approval_requested"
  | "approval_granted"
  | "approval_denied";

export interface AuditLogInput {
  userId: string;
  agentId: string;
  action: string;
  resource: string;
  result: AuditResult;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQuery {
  userId?: string;
  agentId?: string;
  action?: string;
  resource?: string;
  result?: AuditResult;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

// --- Dependency Injection ---

export interface AuditLogServiceDeps {
  /** Insert in mc_audit_log */
  insert: (data: Record<string, unknown>) => Promise<void>;
  /** Select from mc_audit_log mit Filter */
  select: (filter: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
}

/**
 * Erstellt den Audit Log Service.
 * Protokolliert jeden Permission-Check.
 */
export function createAuditLogService(deps: AuditLogServiceDeps) {
  return {
    /**
     * Schreibt einen Audit-Log-Eintrag.
     * Wird bei jedem Permission-Check aufgerufen (granted/denied).
     */
    async log(input: AuditLogInput) {
      const entry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        userId: input.userId,
        agentId: input.agentId,
        action: input.action,
        resource: input.resource,
        result: input.result,
        metadata: input.metadata ?? {},
      };

      await deps.insert(entry);
    },

    /**
     * Abfrage des Audit-Logs mit Filtern.
     */
    async query(filter: AuditLogQuery) {
      return deps.select({
        ...filter,
        limit: filter.limit ?? 100,
        offset: filter.offset ?? 0,
      });
    },
  };
}
