import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/auth";
import {
  formatUfrnDayLabel,
  formatUfrnTime,
  ufrnDayKey,
} from "@/lib/datetime";
import { ReserveButton } from "./_components/reserve-button";
import { CancelButton } from "./_components/cancel-button";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function SlotsPage() {
  const user = await requireUserPage();

  const slots = await prisma.slot.findMany({
    orderBy: { startsAt: "asc" },
    include: { reservation: { include: { student: true } } },
  });

  const myReservation = await prisma.reservation.findUnique({
    where: { studentId: user.id },
    include: { slot: true },
  });

  const groups = new Map<string, typeof slots>();
  for (const slot of slots) {
    const key = ufrnDayKey(slot.startsAt);
    const list = groups.get(key);
    if (list) list.push(slot);
    else groups.set(key, [slot]);
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header>
        <h1 className="page-title">Horários de Prova</h1>
        <p className="page-subtitle">
          Reserve um horário para sua prova oral. Você pode manter apenas uma
          reserva ativa.
        </p>

        {myReservation && (
          <div className="alert-info" style={{ marginTop: "1rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "0.1rem" }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              Você tem reserva ativa em{" "}
              <strong>
                {formatUfrnDayLabel(myReservation.slot.startsAt)} às{" "}
                {formatUfrnTime(myReservation.slot.startsAt)}
              </strong>
              . Cancele para reservar outro horário.
            </span>
          </div>
        )}
      </header>

      {/* Empty state */}
      {slots.length === 0 && (
        <div
          style={{
            border: "2px dashed var(--border-default)",
            borderRadius: "0.75rem",
            padding: "3rem 2rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🗓️</div>
          <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
            Nenhum horário disponível ainda.
          </p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
            O professor ainda não criou horários de prova.
          </p>
        </div>
      )}

      {/* Grupos por dia */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {[...groups.entries()].map(([key, daySlots]) => (
          <section key={key}>
            {/* Cabeçalho do dia */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                marginBottom: "0.75rem",
              }}
            >
              <span
                style={{
                  width: "0.625rem",
                  height: "0.625rem",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  flexShrink: 0,
                }}
              />
              <h2
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  textTransform: "capitalize",
                }}
              >
                {formatUfrnDayLabel(daySlots[0].startsAt)}
              </h2>
            </div>

            {/* Lista de slots */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {daySlots.map((slot) => {
                const isMine = slot.reservation?.studentId === user.id;
                const occupied = Boolean(slot.reservation);
                const isPast = slot.startsAt.getTime() <= Date.now();
                const studentLabel = slot.reservation
                  ? (slot.reservation.student.name ?? slot.reservation.student.email)
                  : null;

                return (
                  <li
                    key={slot.id}
                    style={{
                      background: "var(--bg-surface)",
                      border: `1px solid ${isMine ? "var(--status-mine-border)" : "var(--border-default)"}`,
                      borderRadius: "0.75rem",
                      padding: "0.875rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                      flexWrap: "wrap",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {/* Info do slot */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {formatUfrnTime(slot.startsAt)}
                          <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--text-muted)" }}>
                            {" "}· {slot.durationMin} min
                          </span>
                        </span>
                        {isMine ? (
                          <StatusBadge variant="mine" />
                        ) : occupied ? (
                          <StatusBadge variant="ocupado" label={`Ocupado · ${studentLabel}`} />
                        ) : isPast ? (
                          <StatusBadge variant="past" />
                        ) : (
                          <StatusBadge variant="livre" />
                        )}
                      </div>
                      {(slot.location || slot.note) && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                          {slot.location && (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                              </svg>
                              {slot.location}
                            </>
                          )}
                          {slot.location && slot.note && <span>·</span>}
                          {slot.note && <span>{slot.note}</span>}
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div>
                      {isMine && slot.reservation ? (
                        <CancelButton reservationId={slot.reservation.id} />
                      ) : !occupied && !isPast ? (
                        <ReserveButton
                          slotId={slot.id}
                          disabled={Boolean(myReservation)}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
