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
    <form action={action} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
      <input type="hidden" name="slotId" value={slotId} />
      <button
        type="submit"
        disabled={disabled || pending}
        title={disabled ? "Você já tem uma reserva ativa" : undefined}
        className="btn btn-ghost btn-sm"
        style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
      >
        {pending ? "Reservando…" : "Reservar"}
      </button>
      {state.error && (
        <span style={{ fontSize: "0.75rem", color: "var(--danger)" }}>
          {state.error}
        </span>
      )}
    </form>
  );
}
