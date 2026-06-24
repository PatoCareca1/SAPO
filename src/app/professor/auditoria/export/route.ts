import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireProfessor } from "@/lib/auth";
import {
  auditRowsToCsv,
  buildAuditWhere,
  parseAuditFilters,
} from "@/lib/audit-query";

// Teto de linhas por export, para não estourar memória.
const MAX_ROWS = 10_000;

export async function GET(req: NextRequest) {
  try {
    await requireProfessor();
  } catch (err) {
    const status =
      err instanceof Error && err.message === "UNAUTHENTICATED" ? 401 : 403;
    return new Response("Não autorizado.", { status });
  }

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filters = parseAuditFilters(sp);
  const where = buildAuditWhere(filters);

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: MAX_ROWS,
  });

  const csv = auditRowsToCsv(logs);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  // BOM para o Excel reconhecer UTF-8 (acentos).
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-sapo-${stamp}.csv"`,
    },
  });
}
