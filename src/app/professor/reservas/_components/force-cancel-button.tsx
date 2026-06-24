"use client";

import { useActionState, useState } from "react";
import {
  cancelReservationAction,
  type ReservationActionState,
} from "@/lib/server/reservations";
import { ConfirmModal } from "@/components/confirm-modal";

const initial: ReservationActionState = { ok: false };

export function ForceCancelButton({
  reservationId,
  studentName,
  slotDescription,
}: {
  reservationId: string;
  studentName: string;
  slotDescription: string;
}) {
  const [state, action, pending] = useActionState(cancelReservationAction, initial);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <ConfirmModal
        open={showModal}
        title="Cancelar reserva (forçar)"
        description={`Cancelar a reserva de ${studentName} no slot ${slotDescription}? Esta ação será registrada na auditoria como cancelamento forçado pelo professor.`}
        confirmLabel="Cancelar reserva"
        onCancel={() => setShowModal(false)}
        onConfirm={() => {
          setShowModal(false);
          document
            .getElementById(`force-cancel-${reservationId}`)
            ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }}
      />
      <form id={`force-cancel-${reservationId}`} action={action}>
        <input type="hidden" name="reservationId" value={reservationId} />
        <button
          type="button"
          disabled={pending}
          onClick={() => setShowModal(true)}
          className="btn btn-outline-danger"
        >
          {pending ? "Cancelando…" : "Cancelar (forçar)"}
        </button>
        {state.error && (
          <span style={{ fontSize: "0.75rem", color: "var(--danger)", marginLeft: "0.5rem" }}>
            {state.error}
          </span>
        )}
      </form>
    </>
  );
}
