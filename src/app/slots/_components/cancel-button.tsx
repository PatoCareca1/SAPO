"use client";

import { useActionState } from "react";

import {
  cancelReservationAction,
  type ReservationActionState,
} from "@/lib/server/reservations";

const initial: ReservationActionState = { ok: false };

export function CancelButton({
  reservationId,
  label = "Cancelar",
}: {
  reservationId: string;
  label?: string;
}) {
  const [state, action, pending] = useActionState(
    cancelReservationAction,
    initial,
  );

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Cancelar esta reserva? O horário ficará livre.")) {
          e.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="reservationId" value={reservationId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Cancelando…" : label}
      </button>
      {state.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
