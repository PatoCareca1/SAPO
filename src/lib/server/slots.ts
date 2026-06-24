"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireProfessor } from "@/lib/auth";
import { AuditAction, toAuditActor, writeAudit } from "@/lib/audit";
import { localInputToUtc } from "@/lib/datetime";
import { getRequestMeta } from "@/lib/request-meta";

// Estado de retorno das actions, consumido por useActionState no cliente.
export type SlotActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const SLOTS_PATH = "/professor/slots";

// Teto de slots por lote, para evitar geração acidental em massa.
const MAX_BATCH_SLOTS = 200;

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Data/hora inválida");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const createSlotSchema = z.object({
  startsAtLocal: localDateTime,
  durationMin: z.coerce.number().int().min(5).max(480),
  location: optionalText(200),
  note: optionalText(500),
});

const batchSchema = z
  .object({
    startLocal: localDateTime,
    endLocal: localDateTime,
    durationMin: z.coerce.number().int().min(5).max(480),
    gapMin: z.coerce.number().int().min(0).max(480),
    location: optionalText(200),
    note: optionalText(500),
  })
  .refine((v) => localInputToUtc(v.endLocal) > localInputToUtc(v.startLocal), {
    message: "O fim do intervalo deve ser depois do início.",
  });

const updateSlotSchema = createSlotSchema.extend({
  slotId: z.string().min(1),
});

// Helpers de erro: traduzem exceções de autorização/validação em estado.
function fail(message: string): SlotActionState {
  return { ok: false, error: message };
}

function mapError(err: unknown): SlotActionState {
  if (err instanceof z.ZodError) {
    return fail(err.issues[0]?.message ?? "Dados inválidos.");
  }
  if (err instanceof Error) {
    if (err.message === "UNAUTHENTICATED") return fail("Faça login para continuar.");
    if (err.message === "FORBIDDEN") return fail("Apenas o professor pode fazer isso.");
    return fail(err.message);
  }
  return fail("Erro inesperado.");
}

// ---------------------------------------------------------------------------
// Criar slot individual
// ---------------------------------------------------------------------------
export async function createSlotAction(
  _prev: SlotActionState,
  formData: FormData,
): Promise<SlotActionState> {
  try {
    const prof = await requireProfessor();
    const input = createSlotSchema.parse({
      startsAtLocal: formData.get("startsAtLocal"),
      durationMin: formData.get("durationMin"),
      location: formData.get("location"),
      note: formData.get("note"),
    });

    const startsAt = localInputToUtc(input.startsAtLocal);
    const meta = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      const slot = await tx.slot.create({
        data: {
          startsAt,
          durationMin: input.durationMin,
          location: input.location,
          note: input.note,
        },
      });
      await writeAudit(tx, {
        actor: toAuditActor(prof),
        action: AuditAction.SLOT_CREATED,
        targetType: "slot",
        targetId: slot.id,
        details: {
          startsAt: slot.startsAt.toISOString(),
          durationMin: slot.durationMin,
          location: slot.location,
          note: slot.note,
        },
        ...meta,
      });
    });

    revalidatePath(SLOTS_PATH);
    return { ok: true, message: "Slot criado." };
  } catch (err) {
    return mapError(err);
  }
}

// ---------------------------------------------------------------------------
// Criar slots em lote (intervalo + duração + intervalo entre slots)
// ---------------------------------------------------------------------------
export async function createBatchAction(
  _prev: SlotActionState,
  formData: FormData,
): Promise<SlotActionState> {
  try {
    const prof = await requireProfessor();
    const input = batchSchema.parse({
      startLocal: formData.get("startLocal"),
      endLocal: formData.get("endLocal"),
      durationMin: formData.get("durationMin"),
      gapMin: formData.get("gapMin"),
      location: formData.get("location"),
      note: formData.get("note"),
    });

    const start = localInputToUtc(input.startLocal);
    const end = localInputToUtc(input.endLocal);
    const meta = await getRequestMeta();
    const stepMs = (input.durationMin + input.gapMin) * 60_000;
    const durationMs = input.durationMin * 60_000;

    // Gera os horários de início enquanto o slot inteiro couber no intervalo.
    const startsAtList: Date[] = [];
    for (
      let t = start.getTime();
      t + durationMs <= end.getTime();
      t += stepMs
    ) {
      startsAtList.push(new Date(t));
      if (startsAtList.length > MAX_BATCH_SLOTS) {
        return fail(`Lote excede o limite de ${MAX_BATCH_SLOTS} slots.`);
      }
    }

    if (startsAtList.length === 0) {
      return fail("O intervalo não comporta nenhum slot dessa duração.");
    }

    await prisma.$transaction(async (tx) => {
      const created: string[] = [];
      for (const startsAt of startsAtList) {
        const slot = await tx.slot.create({
          data: {
            startsAt,
            durationMin: input.durationMin,
            location: input.location,
            note: input.note,
          },
        });
        created.push(slot.id);
      }
      // Um único registro de auditoria para o lote, com a lista de ids gerados
      // (rastreável) e os parâmetros usados.
      await writeAudit(tx, {
        actor: toAuditActor(prof),
        action: AuditAction.SLOT_BATCH_CREATED,
        targetType: "slot",
        details: {
          count: created.length,
          slotIds: created,
          startLocal: input.startLocal,
          endLocal: input.endLocal,
          durationMin: input.durationMin,
          gapMin: input.gapMin,
          location: input.location,
          note: input.note,
        },
        ...meta,
      });
    });

    revalidatePath(SLOTS_PATH);
    return { ok: true, message: `${startsAtList.length} slots criados.` };
  } catch (err) {
    return mapError(err);
  }
}

// ---------------------------------------------------------------------------
// Editar slot (auditoria com before/after)
// ---------------------------------------------------------------------------
export async function updateSlotAction(
  _prev: SlotActionState,
  formData: FormData,
): Promise<SlotActionState> {
  try {
    const prof = await requireProfessor();
    const input = updateSlotSchema.parse({
      slotId: formData.get("slotId"),
      startsAtLocal: formData.get("startsAtLocal"),
      durationMin: formData.get("durationMin"),
      location: formData.get("location"),
      note: formData.get("note"),
    });

    const startsAt = localInputToUtc(input.startsAtLocal);
    const meta = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      const before = await tx.slot.findUnique({ where: { id: input.slotId } });
      if (!before) {
        throw new Error("Slot não encontrado.");
      }
      const after = await tx.slot.update({
        where: { id: input.slotId },
        data: {
          startsAt,
          durationMin: input.durationMin,
          location: input.location ?? null,
          note: input.note ?? null,
        },
      });
      await writeAudit(tx, {
        actor: toAuditActor(prof),
        action: AuditAction.SLOT_UPDATED,
        targetType: "slot",
        targetId: input.slotId,
        details: {
          before: {
            startsAt: before.startsAt.toISOString(),
            durationMin: before.durationMin,
            location: before.location,
            note: before.note,
          },
          after: {
            startsAt: after.startsAt.toISOString(),
            durationMin: after.durationMin,
            location: after.location,
            note: after.note,
          },
        },
        ...meta,
      });
    });

    revalidatePath(SLOTS_PATH);
    return { ok: true, message: "Slot atualizado." };
  } catch (err) {
    return mapError(err);
  }
}

// ---------------------------------------------------------------------------
// Excluir slot (registra impacto se houver reserva)
// ---------------------------------------------------------------------------
export async function deleteSlotAction(
  _prev: SlotActionState,
  formData: FormData,
): Promise<SlotActionState> {
  try {
    const prof = await requireProfessor();
    const slotId = z.string().min(1).parse(formData.get("slotId"));
    const meta = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: { reservation: { include: { student: true } } },
      });
      if (!slot) {
        throw new Error("Slot não encontrado.");
      }

      // Impacto: se havia reserva, o aluno é afetado (o delete em cascata
      // remove a reserva). Registramos quem foi afetado na auditoria.
      const impactedReservation = slot.reservation
        ? {
            reservationId: slot.reservation.id,
            studentId: slot.reservation.studentId,
            studentEmail: slot.reservation.student.email,
            studentName: slot.reservation.student.name,
          }
        : null;

      await tx.slot.delete({ where: { id: slotId } });

      await writeAudit(tx, {
        actor: toAuditActor(prof),
        action: AuditAction.SLOT_DELETED,
        targetType: "slot",
        targetId: slotId,
        details: {
          slot: {
            startsAt: slot.startsAt.toISOString(),
            durationMin: slot.durationMin,
            location: slot.location,
            note: slot.note,
          },
          impactedReservation,
        },
        ...meta,
      });
    });

    revalidatePath(SLOTS_PATH);
    return {
      ok: true,
      message: "Slot excluído.",
    };
  } catch (err) {
    return mapError(err);
  }
}
