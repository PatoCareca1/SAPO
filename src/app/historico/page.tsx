import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/auth";
import { formatUfrn } from "@/lib/datetime";
import {
  AUDIT_ACTIONS,
  buildStudentAuditWhere,
  parseAuditFilters,
} from "@/lib/audit-query";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function buildQuery(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUserPage();
  const sp = await searchParams;
  const filters = parseAuditFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);

  const where = buildStudentAuditWhere(user.id, filters);
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const field =
    "rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Meu histórico</h1>
        <p className="text-sm text-zinc-500">
          Ações suas e ações sobre as suas reservas. {total} registro(s).
        </p>
      </header>

      <form
        method="GET"
        action="/historico"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3"
      >
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Ação
          <select name="action" defaultValue={filters.action ?? ""} className={field}>
            <option value="">Todas</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          De
          <input type="date" name="from" defaultValue={filters.from ?? ""} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Até
          <input type="date" name="to" defaultValue={filters.to ?? ""} className={field} />
        </label>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Filtrar
        </button>
        <Link
          href="/historico"
          className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-50"
        >
          Limpar
        </Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Quando (UTC-3)</th>
              <th className="px-3 py-2 font-medium">Ação</th>
              <th className="px-3 py-2 font-medium">Quem fez</th>
              <th className="px-3 py-2 font-medium">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                  Nenhum registro.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-zinc-100 align-top">
                <td className="whitespace-nowrap px-3 py-2">
                  {formatUfrn(log.timestamp)}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{log.action}</td>
                <td className="px-3 py-2 text-xs">
                  {log.actorId === user.id ? "você" : log.actorEmail}
                </td>
                <td className="px-3 py-2">
                  {log.details ? (
                    <details>
                      <summary className="cursor-pointer text-xs text-blue-700">
                        ver
                      </summary>
                      <pre className="mt-1 max-w-md overflow-x-auto rounded bg-zinc-50 p-2 text-xs">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/historico${buildQuery({ ...filters, page: page - 1 })}`}
              className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
            >
              Anterior
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-md border border-zinc-200 px-3 py-1 text-zinc-300">
              Anterior
            </span>
          )}
          {page < totalPages ? (
            <Link
              href={`/historico${buildQuery({ ...filters, page: page + 1 })}`}
              className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
            >
              Próxima
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-md border border-zinc-200 px-3 py-1 text-zinc-300">
              Próxima
            </span>
          )}
        </div>
      </nav>
    </main>
  );
}
