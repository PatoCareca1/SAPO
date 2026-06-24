import type { Prisma } from "@/generated/prisma/client";
import { AuditAction } from "@/lib/audit";
import { localInputToUtc } from "@/lib/datetime";

// Lista de ações para o filtro (select) da tela de auditoria.
export const AUDIT_ACTIONS = Object.values(AuditAction);

export interface AuditFilters {
  actorEmail?: string;
  action?: string;
  targetId?: string;
  from?: string; // "YYYY-MM-DD" (UTC-3)
  to?: string; // "YYYY-MM-DD" (UTC-3)
}

// Lê filtros de um objeto de searchParams (strings).
export function parseAuditFilters(
  sp: Record<string, string | string[] | undefined>,
): AuditFilters {
  const get = (k: string) => {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s : undefined;
  };
  return {
    actorEmail: get("actorEmail"),
    action: get("action"),
    targetId: get("targetId"),
    from: get("from"),
    to: get("to"),
  };
}

// Monta a cláusula de período (UTC-3 → UTC) a partir de from/to.
function timestampRange(filters: AuditFilters) {
  const range: { gte?: Date; lte?: Date } = {};
  if (filters.from) range.gte = localInputToUtc(`${filters.from}T00:00`);
  if (filters.to) range.lte = localInputToUtc(`${filters.to}T23:59`);
  return Object.keys(range).length ? range : undefined;
}

// WHERE comum a partir dos filtros (usado pelo professor).
export function buildAuditWhere(
  filters: AuditFilters,
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (filters.actorEmail) {
    where.actorEmail = { contains: filters.actorEmail, mode: "insensitive" };
  }
  if (filters.action) where.action = filters.action;
  if (filters.targetId) where.targetId = filters.targetId;
  const ts = timestampRange(filters);
  if (ts) where.timestamp = ts;
  return where;
}

// WHERE do aluno: ações onde ele é o ator OU onde a reserva alvo é dele
// (capturado no details JSON: force-cancel do professor e exclusão de slot
// reservado). Combinado com os filtros opcionais (período, ação).
export function buildStudentAuditWhere(
  userId: string,
  filters: AuditFilters,
): Prisma.AuditLogWhereInput {
  const base = buildAuditWhere({
    action: filters.action,
    from: filters.from,
    to: filters.to,
  });
  return {
    AND: [
      base,
      {
        OR: [
          { actorId: userId },
          { details: { path: ["student", "id"], equals: userId } },
          {
            details: {
              path: ["impactedReservation", "studentId"],
              equals: userId,
            },
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
export interface AuditRow {
  timestamp: Date;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: unknown;
  ip: string | null;
  userAgent: string | null;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  // Escapa aspas e envolve em aspas se houver vírgula/aspas/quebra de linha.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function auditRowsToCsv(rows: AuditRow[]): string {
  const header = [
    "timestamp_utc",
    "timestamp_utc3",
    "actorEmail",
    "actorRole",
    "action",
    "targetType",
    "targetId",
    "ip",
    "userAgent",
    "details",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.timestamp.toISOString(),
        new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Recife",
          dateStyle: "short",
          timeStyle: "medium",
        }).format(r.timestamp),
        r.actorEmail,
        r.actorRole,
        r.action,
        r.targetType,
        r.targetId,
        r.ip,
        r.userAgent,
        r.details,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\r\n");
}
