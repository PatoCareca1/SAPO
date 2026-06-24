import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">SAPO — Agendamento de Provas</h1>
      <p className="text-sm text-gray-600">
        Entre com seu e-mail institucional da UFRN.
      </p>

      {error === "AccessDenied" && (
        <p className="text-sm text-red-600">
          Apenas e-mails institucionais da UFRN (@ufrn.edu.br, @ufrn.br) são
          aceitos.
        </p>
      )}

      <form
        action={async () => {
          "use server";
          await signIn("google");
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Entrar com Google
        </button>
      </form>
    </main>
  );
}
