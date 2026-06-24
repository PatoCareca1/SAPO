"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createBatchAction,
  createSlotAction,
  type SlotActionState,
} from "@/lib/server/slots";
import { Feedback } from "./feedback";

const initial: SlotActionState = { ok: false };

export function CreateSlotForm() {
  const [state, action, pending] = useActionState(createSlotAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="card"
      style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
        Criar slot individual
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label className="field-label" style={{ gridColumn: "1 / -1" }}>
          Data e hora (UTC-3)
          <input
            type="datetime-local"
            name="startsAtLocal"
            required
            className="field"
          />
        </label>
        <label className="field-label">
          Duração (min)
          <input
            type="number"
            name="durationMin"
            defaultValue={30}
            min={5}
            max={480}
            required
            className="field"
          />
        </label>
        <label className="field-label">
          Local (opcional)
          <input type="text" name="location" maxLength={200} placeholder="Sala 203 — DCA" className="field" />
        </label>
        <label className="field-label" style={{ gridColumn: "1 / -1" }}>
          Observações (opcional)
          <input type="text" name="note" maxLength={500} placeholder="Prova oral — Cálculo II" className="field" />
        </label>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Criando…" : "Criar slot"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function CreateBatchForm() {
  const [state, action, pending] = useActionState(createBatchAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="card"
      style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 0.25rem" }}>
          Criar lote de slots
        </h2>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
          Gera slots consecutivos do início ao fim do intervalo.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label className="field-label">
          Data início (UTC-3)
          <input type="datetime-local" name="startLocal" required className="field" />
        </label>
        <label className="field-label">
          Data fim (UTC-3)
          <input type="datetime-local" name="endLocal" required className="field" />
        </label>
        <label className="field-label">
          Intervalo (min)
          <input
            type="number"
            name="gapMin"
            defaultValue={0}
            min={0}
            max={480}
            required
            className="field"
          />
        </label>
        <label className="field-label">
          Duração (min)
          <input
            type="number"
            name="durationMin"
            defaultValue={30}
            min={5}
            max={480}
            required
            className="field"
          />
        </label>
        <label className="field-label" style={{ gridColumn: "1 / -1" }}>
          Local (opcional)
          <input type="text" name="location" maxLength={200} placeholder="Lab 2 — DCA" className="field" />
        </label>
        <label className="field-label" style={{ gridColumn: "1 / -1" }}>
          Observações (opcional)
          <input type="text" name="note" maxLength={500} className="field" />
        </label>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Gerando…" : "Criar lote"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
