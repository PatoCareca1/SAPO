"use client";

import { useActionState } from "react";

import {
  reserveSlotAction,
  type ReservationActionState,
} from "@/lib/server/reservations";

const initial: ReservationActionState = { ok: false };

export function ReserveButton({
  slotId,
  disabled,
}: {
  slotId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(reserveSlotAction, initial);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="slotId" value={slotId} />
      <button
        type="submit"
        disabled={disabled || pending}
        title={disabled ? "Você já tem uma reserva ativa" : undefined}
        className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Reservando…" : "Reservar"}
      </button>
      {state.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
