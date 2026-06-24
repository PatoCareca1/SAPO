import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { AuditAction, writeAudit, type AuditActor } from "@/lib/audit";

// Lógica de negócio de reserva/cancelamento, independente de transporte
// (sem "use server", sem auth, sem headers). Recebe o client do Prisma por
// injeção, para ser reusada tanto pelas Server Actions quanto pelos testes de
// concorrência. É AQUI que vivem as garantias atômicas (transação + auditoria)
// e a tradução das violações de unicidade do banco.

export type ReserveResult =
  | { ok: true; reservationId: string }
  | {
      ok: false;
      code: "NOT_FOUND" | "PAST" | "SLOT_TAKEN" | "ALREADY_RESERVED" | "CONFLICT";
    };

export type CancelResult =
  | { ok: true; action: "RESERVATION_CANCELLED" | "RESERVATION_FORCED_CANCEL" }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" };

// Erro interno para sair da transação com um código de negócio.
class CoreError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

interface Meta {
  ip?: string;
  userAgent?: string;
}

export async function reserveSlotCore(
  db: PrismaClient,
  params: { slotId: string; studentId: string; actor: AuditActor } & Meta,
): Promise<ReserveResult> {
  try {
    const reservationId = await db.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({ where: { id: params.slotId } });
      if (!slot) throw new CoreError("NOT_FOUND");
      if (slot.startsAt.getTime() <= Date.now()) throw new CoreError("PAST");

      const reservation = await tx.reservation.create({
        data: { slotId: params.slotId, studentId: params.studentId },
      });

      await writeAudit(tx, {
        actor: params.actor,
        action: AuditAction.RESERVATION_CREATED,
        targetType: "reservation",
        targetId: reservation.id,
        details: {
          slotId: params.slotId,
          startsAt: slot.startsAt.toISOString(),
          durationMin: slot.durationMin,
        },
        ip: params.ip,
        userAgent: params.userAgent,
      });

      return reservation.id;
    });
    return { ok: true, reservationId };
  } catch (err) {
    if (err instanceof CoreError) {
      return { ok: false, code: err.code as "NOT_FOUND" | "PAST" };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // 1. Verificar pelo target da Prisma se disponível (específico)
      const target = err.meta?.target;
      if (Array.isArray(target)) {
        const targetStr = target.join(" ").toLowerCase();
        if (targetStr.includes("slot")) return { ok: false, code: "SLOT_TAKEN" };
        if (targetStr.includes("student")) return { ok: false, code: "ALREADY_RESERVED" };
      } else if (typeof target === "string" && target) {
        const targetStr = target.toLowerCase();
        if (targetStr.includes("slot")) return { ok: false, code: "SLOT_TAKEN" };
        if (targetStr.includes("student")) return { ok: false, code: "ALREADY_RESERVED" };
      }

      // 2. Verificar pela mensagem original do driver adapter (específica)
      const originalMessage = ((err.meta as any)?.driverAdapterError?.cause?.originalMessage || "").toLowerCase();
      if (originalMessage.includes("slotid")) return { ok: false, code: "SLOT_TAKEN" };
      if (originalMessage.includes("studentid")) return { ok: false, code: "ALREADY_RESERVED" };

      // 3. Fallback geral no erro completo (menos específico)
      const errMsg = err.message.toLowerCase();
      if (errMsg.includes("slotid_key") || errMsg.includes("slotid")) {
        return { ok: false, code: "SLOT_TAKEN" };
      }
      if (errMsg.includes("studentid_key") || errMsg.includes("studentid")) {
        return { ok: false, code: "ALREADY_RESERVED" };
      }

      return { ok: false, code: "CONFLICT" };
    }
    throw err;
  }
}

export async function cancelReservationCore(
  db: PrismaClient,
  params: {
    reservationId: string;
    actor: AuditActor;
    isProfessor: boolean;
  } & Meta,
): Promise<CancelResult> {
  try {
    const action = await db.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: params.reservationId },
        include: { slot: true, student: true },
      });
      if (!reservation) throw new CoreError("NOT_FOUND");

      const isOwner = reservation.studentId === params.actor.id;
      if (!isOwner && !params.isProfessor) throw new CoreError("FORBIDDEN");

      await tx.reservation.delete({ where: { id: params.reservationId } });

      const auditAction = isOwner
        ? AuditAction.RESERVATION_CANCELLED
        : AuditAction.RESERVATION_FORCED_CANCEL;

      await writeAudit(tx, {
        actor: params.actor,
        action: auditAction,
        targetType: "reservation",
        targetId: params.reservationId,
        details: {
          slotId: reservation.slotId,
          startsAt: reservation.slot.startsAt.toISOString(),
          student: {
            id: reservation.studentId,
            email: reservation.student.email,
            name: reservation.student.name,
          },
        },
        ip: params.ip,
        userAgent: params.userAgent,
      });

      return auditAction;
    });
    return { ok: true, action };
  } catch (err) {
    if (err instanceof CoreError) {
      return { ok: false, code: err.code as "NOT_FOUND" | "FORBIDDEN" };
    }
    throw err;
  }
}
