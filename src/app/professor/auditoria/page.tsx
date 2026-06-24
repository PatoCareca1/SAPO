import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireProfessorPage } from "@/lib/auth";
import { formatUfrn } from "@/lib/datetime";
import {
  AUDIT_ACTIONS,
  buildAuditWhere,
  parseAuditFilters,
  type AuditFilters,
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

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProfessorPage();
  const sp = await searchParams;
  const filters = parseAuditFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);

  const where = buildAuditWhere(filters);
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
  const filterQuery = { ...filters } as Record<string, string | undefined>;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Auditoria</h1>
          <p className="text-sm text-zinc-500">
            {total} registro(s). Horários em UTC-3.
          </p>
        </div>
        <a
          href={`/professor/auditoria/export${buildQuery(filterQuery)}`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Exportar CSV
        </a>
      </header>

      <AuditFilterForm filters={filters} />

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Quando (UTC-3)</th>
              <th className="px-3 py-2 font-medium">Ator</th>
              <th className="px-3 py-2 font-medium">Papel</th>
              <th className="px-3 py-2 font-medium">Ação</th>
              <th className="px-3 py-2 font-medium">Target</th>
              <th className="px-3 py-2 font-medium">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                  Nenhum registro para os filtros aplicados.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-zinc-100 align-top">
                <td className="whitespace-nowrap px-3 py-2">
                  {formatUfrn(log.timestamp)}
                </td>
                <td className="px-3 py-2">{log.actorEmail}</td>
                <td className="px-3 py-2">{log.actorRole}</td>
                <td className="px-3 py-2 font-mono text-xs">{log.action}</td>
                <td className="px-3 py-2 text-xs">
                  {log.targetType ? `${log.targetType}:${log.targetId ?? "—"}` : "—"}
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
          <PageLink
            disabled={page <= 1}
            href={`/professor/auditoria${buildQuery({ ...filterQuery, page: page - 1 })}`}
          >
            Anterior
          </PageLink>
          <PageLink
            disabled={page >= totalPages}
            href={`/professor/auditoria${buildQuery({ ...filterQuery, page: page + 1 })}`}
          >
            Próxima
          </PageLink>
        </div>
      </nav>
    </main>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-md border border-zinc-200 px-3 py-1 text-zinc-300">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
    >
      {children}
    </Link>
  );
}

function AuditFilterForm({ filters }: { filters: AuditFilters }) {
  const field =
    "rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none";
  return (
    <form
      method="GET"
      action="/professor/auditoria"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3"
    >
      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        Ator (e-mail)
        <input
          type="text"
          name="actorEmail"
          defaultValue={filters.actorEmail ?? ""}
          placeholder="aluno@ufrn.br"
          className={field}
        />
      </label>
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
        Target (id)
        <input
          type="text"
          name="targetId"
          defaultValue={filters.targetId ?? ""}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        De
        <input
          type="date"
          name="from"
          defaultValue={filters.from ?? ""}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        Até
        <input
          type="date"
          name="to"
          defaultValue={filters.to ?? ""}
          className={field}
        />
      </label>
      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Filtrar
      </button>
      <Link
        href="/professor/auditoria"
        className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-50"
      >
        Limpar
      </Link>
    </form>
  );
}
