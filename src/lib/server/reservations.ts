"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toAuditActor } from "@/lib/audit";
import { getRequestMeta } from "@/lib/request-meta";
import {
  cancelReservationCore,
  reserveSlotCore,
  type CancelResult,
  type ReserveResult,
} from "@/lib/reservations-core";

export type ReservationActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const idSchema = z.string().min(1, "Identificador ausente.");

function fail(message: string): ReservationActionState {
  return { ok: false, error: message };
}

// Mapeia os códigos de negócio do core em mensagens para o usuário.
const reserveMessages: Record<
  Exclude<ReserveResult, { ok: true }>["code"],
  string
> = {
  NOT_FOUND: "Horário não encontrado.",
  PAST: "Horário indisponível (já passou).",
  SLOT_TAKEN: "Esse horário já foi reservado por outra pessoa.",
  ALREADY_RESERVED:
    "Você já tem uma reserva ativa. Cancele-a antes de reservar outra.",
  CONFLICT: "Conflito ao reservar. Tente novamente.",
};

const cancelMessages: Record<
  Exclude<CancelResult, { ok: true }>["code"],
  string
> = {
  NOT_FOUND: "Reserva não encontrada.",
  FORBIDDEN: "Você não pode cancelar esta reserva.",
};

function mapAuthError(err: unknown): ReservationActionState {
  if (err instanceof z.ZodError) {
    return fail(err.issues[0]?.message ?? "Dados inválidos.");
  }
  if (err instanceof Error && err.message === "UNAUTHENTICATED") {
    return fail("Faça login para continuar.");
  }
  return fail("Erro inesperado.");
}

export async function reserveSlotAction(
  _prev: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  let user;
  let slotId: string;
  let meta;
  try {
    user = await requireUser();
    slotId = idSchema.parse(formData.get("slotId"));
    meta = await getRequestMeta();
  } catch (err) {
    return mapAuthError(err);
  }

  const result = await reserveSlotCore(prisma, {
    slotId,
    studentId: user.id,
    actor: toAuditActor(user),
    ...meta,
  });

  if (!result.ok) {
    return fail(reserveMessages[result.code]);
  }

  revalidatePath("/slots");
  revalidatePath("/minha-reserva");
  return { ok: true, message: "Reserva confirmada." };
}

export async function cancelReservationAction(
  _prev: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  let user;
  let reservationId: string;
  let meta;
  try {
    user = await requireUser();
    reservationId = idSchema.parse(formData.get("reservationId"));
    meta = await getRequestMeta();
  } catch (err) {
    return mapAuthError(err);
  }

  const result = await cancelReservationCore(prisma, {
    reservationId,
    actor: toAuditActor(user),
    isProfessor: user.role === "PROFESSOR",
    ...meta,
  });

  if (!result.ok) {
    return fail(cancelMessages[result.code]);
  }

  revalidatePath("/slots");
  revalidatePath("/minha-reserva");
  revalidatePath("/professor/slots");
  return { ok: true, message: "Reserva cancelada." };
}
