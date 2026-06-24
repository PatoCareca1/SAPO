import type { Prisma, Role } from "@/generated/prisma/client";

// Ações auditáveis. Mantidas como string (coluna `action` é texto), mas
// centralizadas aqui para evitar typos e dar autocomplete.
export const AuditAction = {
  SLOT_CREATED: "SLOT_CREATED",
  SLOT_BATCH_CREATED: "SLOT_BATCH_CREATED",
  SLOT_UPDATED: "SLOT_UPDATED",
  SLOT_DELETED: "SLOT_DELETED",
  RESERVATION_CREATED: "RESERVATION_CREATED",
  RESERVATION_CANCELLED: "RESERVATION_CANCELLED",
  RESERVATION_FORCED_CANCEL: "RESERVATION_FORCED_CANCEL",
  LOGIN: "LOGIN",
  ADMIN_ADDED: "ADMIN_ADDED",
  ADMIN_REMOVED: "ADMIN_REMOVED",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditActor {
  id: string | null;
  email: string;
  role: Role;
}

export interface AuditInput {
  actor: AuditActor;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  details?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
}

// Escreve um registro de auditoria. REQUER o client de uma transação (`tx`)
// para que o log seja gravado ATOMICAMENTE junto com a ação — nunca deve haver
// ação sem log nem log sem ação. A tabela audit_log é append-only: a aplicação
// jamais faz UPDATE/DELETE nela.
export async function writeAudit(
  tx: Prisma.TransactionClient,
  input: AuditInput,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: input.actor.id ?? undefined,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: input.details,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
}

// Converte o usuário da sessão no formato de ator da auditoria.
export function toAuditActor(user: {
  id: string;
  email?: string | null;
  role: Role;
}): AuditActor {
  return { id: user.id, email: user.email ?? "desconhecido", role: user.role };
}
