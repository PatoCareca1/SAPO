import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a1628 0%, #0f2557 50%, #0a1628 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "26rem",
          padding: "2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.25rem",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: "5rem",
            height: "5rem",
            borderRadius: "1.25rem",
            background: "linear-gradient(135deg, #1a4731 0%, #15803d 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
            marginBottom: "0.75rem",
            boxShadow: "0 8px 24px rgb(21 128 61 / 0.3)",
          }}
        >
          🐸
        </div>

        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          SAPO
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--accent)",
            fontWeight: 600,
            margin: "0 0 0.25rem",
          }}
        >
          Sistema de Agendamento de Provas Orais
        </p>
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
            margin: "0 0 1.5rem",
          }}
        >
          Entre com seu e-mail institucional da UFRN
        </p>

        {/* Erro */}
        {error === "AccessDenied" && (
          <div
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              background: "var(--danger-bg)",
              color: "var(--danger)",
              fontSize: "0.875rem",
              marginBottom: "1rem",
              border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
            }}
          >
            ⚠️ Apenas e-mails institucionais da UFRN (@ufrn.edu.br, @ufrn.br)
            são aceitos.
          </div>
        )}

        {/* Botão Google */}
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
          style={{ width: "100%" }}
        >
          <button
            type="submit"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              padding: "0.75rem 1.25rem",
              borderRadius: "0.625rem",
              border: "1px solid var(--border-default)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontSize: "0.9375rem",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "background 0.15s, box-shadow 0.15s",
            }}
          >
            {/* Google "G" SVG */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
        </form>

        {/* Separador DEMONSTRAÇÃO */}
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            margin: "1.25rem 0 0.75rem",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--border-default)" }} />
          <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em" }}>
            DEMONSTRAÇÃO
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-default)" }} />
        </div>

        {/* Botões de demo */}
        <div style={{ width: "100%", display: "flex", gap: "0.625rem" }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, padding: "0.625rem" }}
            disabled
            title="Em breve — requer banco de dados conectado"
          >
            Entrar como Aluno
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, padding: "0.625rem" }}
            disabled
            title="Em breve — requer banco de dados conectado"
          >
            Prof. Anderson
          </button>
        </div>

        <button
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.8125rem",
            cursor: "pointer",
            marginTop: "0.25rem",
            fontFamily: "inherit",
          }}
          disabled
        >
          Pré-visualizar estado de erro
        </button>

        {/* Footer */}
        <div
          style={{
            marginTop: "1.25rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-muted)",
            width: "100%",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          UFRN — DCA / ECT · Acesso seguro via Google OAuth
        </div>
      </div>
    </div>
  );
}
