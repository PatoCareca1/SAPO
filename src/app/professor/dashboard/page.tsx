import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireProfessorPage } from "@/lib/auth";
import { formatUfrnDayLabel, formatUfrnTime } from "@/lib/datetime";
import { MetricCard } from "@/components/metric-card";
import { ActionBadge, StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireProfessorPage();

  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalSlots, reservedSlots, upcomingSlots, recentLogs] =
    await Promise.all([
      prisma.slot.count(),
      prisma.slot.count({ where: { reservation: { isNot: null } } }),
      prisma.slot.findMany({
        where: { startsAt: { gte: now, lte: in7days } },
        orderBy: { startsAt: "asc" },
        take: 5,
        include: { reservation: { include: { student: true } } },
      }),
      prisma.auditLog.findMany({
        orderBy: { timestamp: "desc" },
        take: 5,
      }),
    ]);

  const freeSlots = totalSlots - reservedSlots;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div>
        <h1 className="page-title">Painel do Professor</h1>
        <p className="page-subtitle">
          Bem-vindo, Prof. Anderson. Aqui está um resumo do agendamento de provas.
        </p>
      </div>

      {/* Métricas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
          gap: "1rem",
        }}
      >
        <MetricCard label="Total de slots" value={totalSlots} color="blue" />
        <MetricCard label="Slots livres" value={freeSlots} color="green" />
        <MetricCard label="Slots ocupados" value={reservedSlots} color="amber" />
        <MetricCard label="Próximos 7 dias" value={totalSlots} color="purple" />
      </div>

      {/* Ações rápidas */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/professor/slots" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Criar slot
        </Link>
        <Link href="/professor/slots" className="btn btn-ghost">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Criar lote de slots
        </Link>
        <Link href="/professor/auditoria" className="btn btn-ghost">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Ver auditoria
        </Link>
      </div>

      {/* Linha: próximas reservas + atividade recente */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,3fr) minmax(0,2fr)", gap: "1.5rem", flexWrap: "wrap" }}>

          {/* Próximas reservas */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "1.125rem 1.25rem", borderBottom: "1px solid var(--border-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Próximas reservas
              </h2>
              <Link href="/professor/reservas" style={{ fontSize: "0.8125rem", color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                Ver todas
              </Link>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Aluno</th>
                    <th>Local</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingSlots.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                        Nenhum slot nos próximos 7 dias.
                      </td>
                    </tr>
                  )}
                  {upcomingSlots.map((slot) => (
                    <tr key={slot.id}>
                      <td style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                        <span style={{ color: "var(--text-secondary)" }}>{formatUfrnDayLabel(slot.startsAt).split(",")[0]}</span>
                        {" "}· {formatUfrnTime(slot.startsAt)}
                      </td>
                      <td style={{ fontSize: "0.8125rem" }}>
                        {slot.reservation
                          ? (slot.reservation.student.name ?? slot.reservation.student.email)
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {slot.location ?? "—"}
                      </td>
                      <td>
                        {slot.reservation
                          ? <StatusBadge variant="ocupado" label="Reservado" />
                          : <StatusBadge variant="livre" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Atividade recente */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "1.125rem 1.25rem", borderBottom: "1px solid var(--border-muted)" }}>
              <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Atividade recente
              </h2>
            </div>
            <div style={{ padding: "0.5rem 0" }}>
              {recentLogs.length === 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "1rem 1.25rem" }}>
                  Nenhuma atividade ainda.
                </p>
              )}
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.625rem 1.25rem",
                    borderBottom: "1px solid var(--border-muted)",
                  }}
                >
                  <ActionBadge action={log.action} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.actorEmail.split("@")[0]}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {log.timestamp.toLocaleString("pt-BR", { timeZone: "America/Recife", dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
