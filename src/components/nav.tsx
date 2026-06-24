import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/auth";

// Navegação por papel. Renderizada no layout; some quando não há sessão
// (ex.: página de login).
export async function Nav() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isProfessor = user.role === "PROFESSOR";
  const linkClass = "text-sm text-zinc-700 hover:text-black";

  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
        <Link href="/slots" className="font-semibold">
          SAPO
        </Link>
        <Link href="/slots" className={linkClass}>
          Horários
        </Link>
        {!isProfessor && (
          <Link href="/minha-reserva" className={linkClass}>
            Minha reserva
          </Link>
        )}
        <Link href="/historico" className={linkClass}>
          Meu histórico
        </Link>
        {isProfessor && (
          <>
            <Link href="/professor/slots" className={linkClass}>
              Gerenciar slots
            </Link>
            <Link href="/professor/auditoria" className={linkClass}>
              Auditoria
            </Link>
          </>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-zinc-500">{user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
            >
              Sair
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
