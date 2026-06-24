import { redirect } from "next/navigation";

import { auth } from "@/auth";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

// Guard para páginas (Server Components): exige usuário autenticado.
export async function requireUserPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// Guard para páginas (Server Components): redireciona em vez de lançar erro.
export async function requireProfessorPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "PROFESSOR") {
    redirect("/");
  }
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

export async function requireProfessor() {
  const user = await requireUser();
  if (user.role !== "PROFESSOR") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
