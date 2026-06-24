"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createBatchAction,
  createSlotAction,
  type SlotActionState,
} from "@/lib/server/slots";
import { Feedback } from "./feedback";

const initial: SlotActionState = { ok: false };

const field =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";
const label = "flex flex-col gap-1 text-sm font-medium text-zinc-700";
const button =
  "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50";

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
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4"
    >
      <h2 className="text-base font-semibold">Criar slot individual</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Início (horário local UFRN, UTC-3)
          <input
            type="datetime-local"
            name="startsAtLocal"
            required
            className={field}
          />
        </label>
        <label className={label}>
          Duração (min)
          <input
            type="number"
            name="durationMin"
            defaultValue={30}
            min={5}
            max={480}
            required
            className={field}
          />
        </label>
        <label className={label}>
          Local (opcional)
          <input type="text" name="location" maxLength={200} className={field} />
        </label>
        <label className={label}>
          Observação (opcional)
          <input type="text" name="note" maxLength={500} className={field} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={button}>
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
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4"
    >
      <h2 className="text-base font-semibold">Criar slots em lote</h2>
      <p className="text-xs text-zinc-500">
        Gera slots consecutivos do início ao fim do intervalo, cada um com a
        duração informada (mais um intervalo opcional entre eles).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Início do intervalo (UTC-3)
          <input
            type="datetime-local"
            name="startLocal"
            required
            className={field}
          />
        </label>
        <label className={label}>
          Fim do intervalo (UTC-3)
          <input
            type="datetime-local"
            name="endLocal"
            required
            className={field}
          />
        </label>
        <label className={label}>
          Duração de cada slot (min)
          <input
            type="number"
            name="durationMin"
            defaultValue={30}
            min={5}
            max={480}
            required
            className={field}
          />
        </label>
        <label className={label}>
          Intervalo entre slots (min)
          <input
            type="number"
            name="gapMin"
            defaultValue={0}
            min={0}
            max={480}
            required
            className={field}
          />
        </label>
        <label className={label}>
          Local (opcional)
          <input type="text" name="location" maxLength={200} className={field} />
        </label>
        <label className={label}>
          Observação (opcional)
          <input type="text" name="note" maxLength={500} className={field} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Gerando…" : "Gerar slots"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
