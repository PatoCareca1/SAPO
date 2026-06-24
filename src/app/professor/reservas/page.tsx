import { prisma } from "@/lib/prisma";
import { requireProfessorPage } from "@/lib/auth";
import { formatUfrn } from "@/lib/datetime";
import { ForceCancelButton } from "./_components/force-cancel-button";

export const dynamic = "force-dynamic";

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireProfessorPage();
  const { q } = await searchParams;

  const reservations = await prisma.reservation.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      student: true,
      slot: true,
    },
    where: q
      ? {
          OR: [
            { student: { name: { contains: q, mode: "insensitive" } } },
            { student: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
  });

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Reservas Ativas</h1>
          <p className="page-subtitle">
            Reservas confirmadas pelos alunos.
          </p>
        </div>
        {/* Busca */}
        <form method="GET" action="/professor/reservas" style={{ display: "flex", gap: "0.5rem" }}>
          <div style={{ position: "relative" }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por nome ou e-mail"
              className="field"
              style={{ paddingLeft: "2.25rem", width: "18rem" }}
            />
          </div>
          <button type="submit" className="btn btn-ghost btn-sm">Buscar</button>
          {q && (
            <a href="/professor/reservas" className="btn btn-ghost btn-sm">
              Limpar
            </a>
          )}
        </form>
      </div>

      {/* Tabela */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>E-mail</th>
                <th>Slot (Data/Hora)</th>
                <th>Local</th>
                <th>Reservado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem" }}>
                    {q ? `Nenhuma reserva encontrada para "${q}".` : "Nenhuma reserva ativa no momento."}
                  </td>
                </tr>
              )}
              {reservations.map((res) => {
                const studentName = res.student.name ?? res.student.email.split("@")[0];
                const slotDesc = res.slot.startsAt.toLocaleString("pt-BR", {
                  timeZone: "America/Recife",
                  dateStyle: "short",
                  timeStyle: "short",
                });
                return (
                  <tr key={res.id}>
                    <td style={{ fontWeight: 500 }}>{studentName}</td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{res.student.email}</td>
                    <td style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                      {slotDesc}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {res.slot.location ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {formatUfrn(res.createdAt)}
                    </td>
                    <td>
                      <ForceCancelButton
                        reservationId={res.id}
                        studentName={studentName}
                        slotDescription={slotDesc}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
