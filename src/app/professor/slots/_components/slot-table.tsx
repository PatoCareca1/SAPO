"use client";

import { useActionState, useState } from "react";

import {
  deleteSlotAction,
  updateSlotAction,
  type SlotActionState,
} from "@/lib/server/slots";
import { Feedback } from "./feedback";

export type SlotView = {
  id: string;
  startsAtLocalInput: string; // para o form de edição (UTC-3)
  startsAtDisplay: string; // exibição em UTC-3
  durationMin: number;
  location: string | null;
  note: string | null;
  reservation: { studentEmail: string; studentName: string | null } | null;
};

const initial: SlotActionState = { ok: false };

const field =
  "rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none";

export function SlotTable({ slots }: { slots: SlotView[] }) {
  if (slots.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
        Nenhum slot criado ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-zinc-50 text-left text-zinc-600">
          <tr>
            <th className="px-3 py-2 font-medium">Início (UTC-3)</th>
            <th className="px-3 py-2 font-medium">Duração</th>
            <th className="px-3 py-2 font-medium">Local</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            // key inclui os campos editáveis: quando um save altera o slot e a
            // página revalida, a linha remonta e o form de edição fecha sozinho
            // (sem precisar de setState em efeito).
            <SlotRow
              key={`${slot.id}:${slot.startsAtLocalInput}:${slot.durationMin}:${slot.location ?? ""}:${slot.note ?? ""}`}
              slot={slot}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlotRow({ slot }: { slot: SlotView }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updating] = useActionState(
    updateSlotAction,
    initial,
  );
  const [deleteState, deleteFormAction, deleting] = useActionState(
    deleteSlotAction,
    initial,
  );

  if (editing) {
    return (
      <tr className="border-t border-zinc-100 align-top">
        <td colSpan={5} className="px-3 py-3">
          <form action={updateAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="slotId" value={slot.id} />
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Início (UTC-3)
              <input
                type="datetime-local"
                name="startsAtLocal"
                defaultValue={slot.startsAtLocalInput}
                required
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Duração (min)
              <input
                type="number"
                name="durationMin"
                defaultValue={slot.durationMin}
                min={5}
                max={480}
                required
                className={`${field} w-24`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Local
              <input
                type="text"
                name="location"
                defaultValue={slot.location ?? ""}
                maxLength={200}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Observação
              <input
                type="text"
                name="note"
                defaultValue={slot.note ?? ""}
                maxLength={500}
                className={field}
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={updating}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {updating ? "Salvando…" : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <Feedback state={updateState} />
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-zinc-100">
      <td className="px-3 py-2">{slot.startsAtDisplay}</td>
      <td className="px-3 py-2">{slot.durationMin} min</td>
      <td className="px-3 py-2">{slot.location ?? "—"}</td>
      <td className="px-3 py-2">
        {slot.reservation ? (
          <span className="text-amber-700">
            Ocupado · {slot.reservation.studentName ?? slot.reservation.studentEmail}
          </span>
        ) : (
          <span className="text-green-700">Livre</span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
          >
            Editar
          </button>
          <form
            action={deleteFormAction}
            onSubmit={(e) => {
              const msg = slot.reservation
                ? "Este slot está RESERVADO. Excluir também cancela a reserva do aluno. Confirmar?"
                : "Excluir este slot?";
              if (!confirm(msg)) e.preventDefault();
            }}
          >
            <input type="hidden" name="slotId" value={slot.id} />
            <button
              type="submit"
              disabled={deleting}
              className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </button>
          </form>
          <Feedback state={deleteState} />
        </div>
      </td>
    </tr>
  );
}
