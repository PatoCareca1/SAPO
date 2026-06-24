import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { isAllowedEmailDomain, isProfessorEmail } from "@/lib/email-domain";
import { AuditAction, writeAudit } from "@/lib/audit";
import { getRequestMeta } from "@/lib/request-meta";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Login OAuth já confirma a posse do e-mail; aqui só reforçamos
    // server-side que o domínio é da UFRN (não confiar no front).
    async signIn({ user }) {
      return !!user.email && isAllowedEmailDomain(user.email);
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      return session;
    },
  },
  events: {
    // O adapter cria o usuário com role padrão STUDENT (schema.prisma);
    // promovemos para PROFESSOR se o e-mail estiver na allowlist.
    async createUser({ user }) {
      if (user.email && isProfessorEmail(user.email)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "PROFESSOR" },
        });
      }
    },
    // Auditoria de LOGIN. Não há ação pareada, então usamos uma transação
    // trivial só para manter o mesmo caminho de escrita (append-only).
    async signIn({ user }) {
      if (!user?.id || !user.email) return;
      const role =
        (user as { role?: "STUDENT" | "PROFESSOR" }).role ?? "STUDENT";
      const meta = await getRequestMeta();
      await prisma.$transaction((tx) =>
        writeAudit(tx, {
          actor: { id: user.id!, email: user.email!, role },
          action: AuditAction.LOGIN,
          targetType: "user",
          targetId: user.id,
          ...meta,
        }),
      );
    },
  },
});
