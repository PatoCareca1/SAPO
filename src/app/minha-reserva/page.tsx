import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/auth";
import { formatUfrnDayLabel, formatUfrnTime } from "@/lib/datetime";
import { CancelButton } from "@/app/slots/_components/cancel-button";

export const dynamic = "force-dynamic";

export default async function MyReservationPage() {
  const user = await requireUserPage();

  const reservation = await prisma.reservation.findUnique({
    where: { studentId: user.id },
    include: { slot: true },
  });

  return (
    <div className="page-wrapper-narrow">
      <header>
        <h1 className="page-title">Minha Reserva</h1>
        <p className="page-subtitle">Horário no fuso da UFRN (UTC-3).</p>
      </header>

      {reservation ? (
        <div>
          {/* Hero card */}
          <div
            style={{
              borderRadius: "1rem",
              overflow: "hidden",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {/* Topo navy */}
            <div
              style={{
                background: "linear-gradient(135deg, #0f2557 0%, #1a3a6e 100%)",
                padding: "1.75rem 1.75rem 2rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Sapo decorativo */}
              <div
                style={{
                  position: "absolute",
                  right: "1.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "6rem",
                  opacity: 0.12,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                🐸
              </div>

              <span
                className="badge badge-mine"
                style={{ marginBottom: "1rem", display: "inline-flex" }}
              >
                ★ Reserva confirmada
              </span>

              <div style={{ color: "#cbd5e1", fontSize: "0.9375rem", fontWeight: 500, marginBottom: "0.25rem", textTransform: "capitalize" }}>
                {formatUfrnDayLabel(reservation.slot.startsAt)}
              </div>
              <div style={{ color: "#ffffff", fontSize: "3.5rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em" }}>
                {formatUfrnTime(reservation.slot.startsAt)}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                Duração de {reservation.slot.durationMin} minutos
              </div>
            </div>

            {/* Parte branca com detalhes */}
            <div
              className="card"
              style={{
                borderRadius: 0,
                borderTop: "none",
                padding: "1.5rem 1.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                {reservation.slot.location && (
                  <div>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.375rem" }}>
                      LOCAL
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.9375rem", color: "var(--text-primary)", fontWeight: 500 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {reservation.slot.location}
                    </div>
                  </div>
                )}
                {reservation.slot.note && (
                  <div>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.375rem" }}>
                      OBSERVAÇÕES
                    </div>
                    <div style={{ fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                      {reservation.slot.note}
                    </div>
                  </div>
                )}
              </div>

              <CancelButton
                reservationId={reservation.id}
                label="Cancelar reserva"
                slotDescription={`${formatUfrnDayLabel(reservation.slot.startsAt)} às ${formatUfrnTime(reservation.slot.startsAt)}`}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div
          style={{
            border: "2px dashed var(--border-default)",
            borderRadius: "0.75rem",
            padding: "3rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div style={{ fontSize: "3rem" }}>📋</div>
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1rem", marginBottom: "0.25rem" }}>
              Nenhuma reserva ativa
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Você ainda não tem uma reserva ativa.
            </p>
          </div>
          <Link href="/slots" className="btn btn-primary">
            Ver horários disponíveis
          </Link>
        </div>
      )}
    </div>
  );
}
