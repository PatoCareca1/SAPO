import { headers } from "next/headers";

// Extrai ip e user-agent da requisição atual para enriquecer a auditoria.
// Best-effort: se os headers não estiverem disponíveis no contexto, retorna {}.
export async function getRequestMeta(): Promise<{
  ip?: string;
  userAgent?: string;
}> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
    const userAgent = h.get("user-agent") || undefined;
    return { ip, userAgent };
  } catch {
    return {};
  }
}
