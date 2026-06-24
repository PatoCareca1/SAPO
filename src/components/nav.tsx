import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";

/** Ícone/logo do SAPO */
function SapoLogo() {
  return (
    <div
      style={{
        width: "2rem",
        height: "2rem",
        borderRadius: "0.5rem",
        background: "linear-gradient(135deg, #1a4731 0%, #15803d 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.1rem",
        flexShrink: 0,
      }}
    >
      🐸
    </div>
  );
}

export async function Nav() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isProfessor = user.role === "PROFESSOR";

  return (
    <header
      style={{
        background: "var(--bg-nav)",
        borderBottom: "1px solid var(--border-default)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Linha principal */}
      <nav
        style={{
          maxWidth: "80rem",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "3.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        {/* Logo */}
        <Link
          href={isProfessor ? "/professor/dashboard" : "/slots"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
          }}
        >
          <SapoLogo />
          <span
            style={{
              fontWeight: 700,
              fontSize: "1.125rem",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            SAPO
          </span>
        </Link>

        {/* Links de navegação */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flex: 1 }}>
          {isProfessor ? (
            <>
              <NavLink href="/professor/dashboard">Painel</NavLink>
              <NavLink href="/professor/slots">Gerenciar slots</NavLink>
              <NavLink href="/professor/reservas">Reservas</NavLink>
              <NavLink href="/professor/auditoria">Auditoria</NavLink>
            </>
          ) : (
            <>
              <NavLink href="/slots">Horários</NavLink>
              <NavLink href="/minha-reserva">Minha reserva</NavLink>
              <NavLink href="/historico">Meu histórico</NavLink>
            </>
          )}
        </div>

        {/* Direita: dark toggle + email + sair */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ThemeToggle />
          <span
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
              maxWidth: "14rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "none",
            }}
            className="nav-email"
          >
            {user.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="btn btn-ghost btn-sm"
            >
              Sair
            </button>
          </form>
        </div>
      </nav>

      {/* Barra de timezone */}
      <div
        style={{
          borderTop: "1px solid var(--border-muted)",
          background: "var(--bg-muted)",
          padding: "0.3rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "0.375rem",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Horário de Brasília · UTC-3 (America/Recife)
        <span style={{ marginLeft: "0.75rem", color: "var(--text-muted)", opacity: 0.7 }}>
          {user.email}
        </span>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "var(--text-secondary)",
        textDecoration: "none",
        padding: "0.375rem 0.625rem",
        borderRadius: "0.375rem",
        transition: "background 0.15s, color 0.15s",
      }}
      className="nav-link"
    >
      {children}
    </Link>
  );
}
