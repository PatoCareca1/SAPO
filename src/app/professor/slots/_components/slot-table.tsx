"use client";

import { useActionState, useState } from "react";

import {
  deleteSlotAction,
  updateSlotAction,
  type SlotActionState,
} from "@/lib/server/slots";
import { Feedback } from "./feedback";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmModal } from "@/components/confirm-modal";

export type SlotView = {
  id: string;
  startsAtLocalInput: string;
  startsAtDisplay: string;
  durationMin: number;
  location: string | null;
  note: string | null;
  reservation: { id: string; studentEmail: string; studentName: string | null } | null;
};

const initial: SlotActionState = { ok: false };

export function SlotTable({ slots }: { slots: SlotView[] }) {
  if (slots.length === 0) {
    return (
      <div
        style={{
          border: "2px dashed var(--border-default)",
          borderRadius: "0.75rem",
          padding: "3rem 2rem",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🗓️</div>
        <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Nenhum slot criado ainda.</p>
        <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>Use os formulários acima para criar slots.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data/Hora (UTC-3)</th>
              <th>Duração</th>
              <th>Local</th>
              <th>Status</th>
              <th>Aluno</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <SlotRow
                key={`${slot.id}:${slot.startsAtLocalInput}:${slot.durationMin}:${slot.location ?? ""}:${slot.note ?? ""}`}
                slot={slot}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlotRow({ slot }: { slot: SlotView }) {
  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
      <tr style={{ background: "var(--bg-muted)" }}>
        <td colSpan={6} style={{ padding: "1rem 1.25rem" }}>
          <form action={updateAction} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "0.75rem" }}>
            <input type="hidden" name="slotId" value={slot.id} />
            <label className="field-label">
              Início (UTC-3)
              <input
                type="datetime-local"
                name="startsAtLocal"
                defaultValue={slot.startsAtLocalInput}
                required
                className="field"
                style={{ width: "auto" }}
              />
            </label>
            <label className="field-label">
              Duração (min)
              <input
                type="number"
                name="durationMin"
                defaultValue={slot.durationMin}
                min={5}
                max={480}
                required
                className="field"
                style={{ width: "5rem" }}
              />
            </label>
            <label className="field-label">
              Local
              <input
                type="text"
                name="location"
                defaultValue={slot.location ?? ""}
                maxLength={200}
                className="field"
              />
            </label>
            <label className="field-label">
              Observação
              <input
                type="text"
                name="note"
                defaultValue={slot.note ?? ""}
                maxLength={500}
                className="field"
              />
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button type="submit" disabled={updating} className="btn btn-primary btn-sm">
                {updating ? "Salvando…" : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn btn-ghost btn-sm"
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
    <>
      <ConfirmModal
        open={showDeleteModal}
        title="Excluir slot"
        description={
          slot.reservation
            ? `Este slot tem reserva ativa de ${slot.reservation.studentName ?? slot.reservation.studentEmail}. Continuar vai cancelar a reserva e registrar na auditoria.`
            : "Tem certeza que deseja excluir este slot?"
        }
        confirmLabel="Excluir"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          document
            .getElementById(`delete-form-${slot.id}`)
            ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }}
      />
      <tr>
        <td style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>{slot.startsAtDisplay}</td>
        <td style={{ fontSize: "0.8125rem" }}>{slot.durationMin} min</td>
        <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{slot.location ?? "—"}</td>
        <td>
          {slot.reservation
            ? <StatusBadge variant="ocupado" label="Reservado" />
            : <StatusBadge variant="livre" />}
        </td>
        <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
          {slot.reservation
            ? (slot.reservation.studentName ?? slot.reservation.studentEmail)
            : <span style={{ color: "var(--text-muted)" }}>—</span>}
        </td>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn btn-ghost btn-sm"
            >
              Editar
            </button>
            <form id={`delete-form-${slot.id}`} action={deleteFormAction}>
              <input type="hidden" name="slotId" value={slot.id} />
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-outline-danger"
              >
                {deleting ? "Excluindo…" : "Excluir"}
              </button>
            </form>
            <Feedback state={deleteState} />
          </div>
        </td>
      </tr>
    </>
  );
}
