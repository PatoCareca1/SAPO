import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { isAllowedEmailDomain, isProfessorEmail } from "@/lib/email-domain";
import { AuditAction, writeAudit } from "@/lib/audit";
import { getRequestMeta } from "@/lib/request-meta";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: process.env.NODE_ENV === "development" ? "jwt" : "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    ...(process.env.NODE_ENV === "development"
      ? [
          Credentials({
            name: "Development Credentials",
            credentials: {
              email: { label: "Email", type: "text" },
              name: { label: "Name", type: "text" },
              role: { label: "Role", type: "text" },
            },
            async authorize(credentials) {
              const email = credentials?.email as string;
              const name = credentials?.name as string;
              const role = credentials?.role as "STUDENT" | "PROFESSOR";

              if (!email || !isAllowedEmailDomain(email)) {
                return null;
              }

              // Busca ou cria o usuário localmente no banco de dados para os testes
              let user = await prisma.user.findUnique({
                where: { email },
              });

              if (!user) {
                user = await prisma.user.create({
                  data: {
                    email,
                    name: name || email.split("@")[0],
                    role: role || (isProfessorEmail(email) ? "PROFESSOR" : "STUDENT"),
                  },
                });
              } else {
                const updatedData: Record<string, any> = {};
                if (role && user.role !== role) {
                  updatedData.role = role;
                }
                if (name && user.name !== name) {
                  updatedData.name = name;
                }
                if (Object.keys(updatedData).length > 0) {
                  user = await prisma.user.update({
                    where: { id: user.id },
                    data: updatedData,
                  });
                }
              }

              return user;
            },
          }),
        ]
      : []),
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
    async session({ session, user, token }) {
      if (token) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "STUDENT" | "PROFESSOR";
      } else if (user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as any).role;
      }
      return token;
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
