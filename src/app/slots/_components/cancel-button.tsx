"use client";

import { useActionState, useState } from "react";

import {
  cancelReservationAction,
  type ReservationActionState,
} from "@/lib/server/reservations";
import { ConfirmModal } from "@/components/confirm-modal";

const initial: ReservationActionState = { ok: false };

export function CancelButton({
  reservationId,
  label = "Cancelar",
  slotDescription,
}: {
  reservationId: string;
  label?: string;
  slotDescription?: string;
}) {
  const [state, action, pending] = useActionState(
    cancelReservationAction,
    initial,
  );
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <ConfirmModal
        open={showModal}
        title="Cancelar reserva"
        description={
          slotDescription
            ? `Tem certeza que deseja cancelar sua reserva de ${slotDescription}? O horário voltará a ficar livre para outros alunos.`
            : "Tem certeza que deseja cancelar sua reserva? O horário voltará a ficar livre para outros alunos."
        }
        confirmLabel="Cancelar reserva"
        onCancel={() => setShowModal(false)}
        onConfirm={() => {
          setShowModal(false);
          // submete o form programaticamente
          document.getElementById(`cancel-form-${reservationId}`)?.dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
        }}
      />
      <form
        id={`cancel-form-${reservationId}`}
        action={action}
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}
      >
        <input type="hidden" name="reservationId" value={reservationId} />
        <button
          type="button"
          disabled={pending}
          onClick={() => setShowModal(true)}
          className="btn btn-ghost btn-sm"
          style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 40%, transparent)" }}
        >
          {pending ? "Cancelando…" : label}
        </button>
        {state.error && (
          <span style={{ fontSize: "0.75rem", color: "var(--danger)" }}>
            {state.error}
          </span>
        )}
      </form>
    </>
  );
}
