import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/auth";
import { formatUfrn } from "@/lib/datetime";
import {
  AUDIT_ACTIONS,
  buildStudentAuditWhere,
  parseAuditFilters,
} from "@/lib/audit-query";
import { ActionBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function buildQuery(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUserPage();
  const sp = await searchParams;
  const filters = parseAuditFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);

  const where = buildStudentAuditWhere(user.id, filters);
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Meu Histórico</h1>
          <p className="page-subtitle">
            Ações suas e ações sobre as suas reservas. {total} registro(s).
          </p>
        </div>
        <span
          className="badge badge-gray"
          style={{ marginTop: "0.5rem", gap: "0.375rem" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="15" y2="9"/>
            <line x1="9" y1="12" x2="15" y2="12"/>
            <line x1="9" y1="15" x2="11" y2="15"/>
          </svg>
          Registro imutável (append-only)
        </span>
      </div>

      {/* Filtros */}
      <form
        method="GET"
        action="/historico"
        className="card"
        style={{ padding: "1rem 1.25rem", display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "0.75rem" }}
      >
        <label className="field-label" style={{ minWidth: "10rem" }}>
          Ação
          <select name="action" defaultValue={filters.action ?? ""} className="field">
            <option value="">Todas as ações</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          De
          <input type="date" name="from" defaultValue={filters.from ?? ""} className="field" />
        </label>
        <label className="field-label">
          Até
          <input type="date" name="to" defaultValue={filters.to ?? ""} className="field" />
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="btn btn-primary btn-sm">
            Filtrar
          </button>
          <Link href="/historico" className="btn btn-ghost btn-sm">
            Limpar
          </Link>
        </div>
      </form>

      {/* Tabela */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Quando (UTC-3)</th>
                <th>Ação</th>
                <th>Quem fez</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                    {formatUfrn(log.timestamp)}
                  </td>
                  <td>
                    <ActionBadge action={log.action} />
                  </td>
                  <td style={{ fontSize: "0.875rem" }}>
                    {log.actorId === user.id ? (
                      <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>você</span>
                    ) : (
                      <span style={{ color: "var(--text-secondary)" }}>{log.actorEmail}</span>
                    )}
                  </td>
                  <td>
                    {log.details ? (
                      <details>
                        <summary
                          style={{ cursor: "pointer", fontSize: "0.8125rem", color: "var(--accent)", userSelect: "none" }}
                        >
                          ver ›
                        </summary>
                        <pre
                          style={{
                            marginTop: "0.5rem",
                            padding: "0.75rem",
                            background: "var(--bg-muted)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem",
                            overflowX: "auto",
                            maxWidth: "28rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem" }}>
        <span style={{ color: "var(--text-muted)" }}>
          Página {page} de {totalPages}
        </span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {page > 1 ? (
            <Link
              href={`/historico${buildQuery({ ...filters, page: page - 1 })}`}
              className="btn btn-ghost btn-sm"
            >
              Anterior
            </Link>
          ) : (
            <span className="btn btn-ghost btn-sm" style={{ opacity: 0.4, cursor: "not-allowed" }}>
              Anterior
            </span>
          )}
          {page < totalPages ? (
            <Link
              href={`/historico${buildQuery({ ...filters, page: page + 1 })}`}
              className="btn btn-ghost btn-sm"
            >
              Próxima
            </Link>
          ) : (
            <span className="btn btn-ghost btn-sm" style={{ opacity: 0.4, cursor: "not-allowed" }}>
              Próxima
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
