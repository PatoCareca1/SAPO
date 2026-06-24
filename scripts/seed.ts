import "dotenv/config";

import { prisma } from "@/lib/prisma";
import type { Slot } from "@/generated/prisma/client";

// Seed para testes manuais (Etapa 9). Requer DATABASE_URL e a migration
// aplicada. Cria um professor, alguns alunos e slots (um já reservado).
//
//   pnpm db:seed
//
// Observação: o login real é via Google OAuth; este seed apenas cria as linhas
// de User para que as telas tenham dados. Use o e-mail abaixo no PROFESSOR_EMAILS
// se quiser que o login promova você a professor.

const PROFESSOR_EMAIL =
  process.env.PROFESSOR_EMAILS?.split(",")[0]?.trim() || "anderson@ufrn.br";

async function main() {
  const professor = await prisma.user.upsert({
    where: { email: PROFESSOR_EMAIL },
    update: { role: "PROFESSOR" },
    create: { email: PROFESSOR_EMAIL, name: "Prof. Anderson", role: "PROFESSOR" },
  });

  const alunos = await Promise.all(
    [
      { email: "joao@academico.ufrn.br", name: "João Silva" },
      { email: "maria@academico.ufrn.br", name: "Maria Souza" },
      { email: "pedro@academico.ufrn.br", name: "Pedro Lima" },
    ].map((a) =>
      prisma.user.upsert({
        where: { email: a.email },
        update: {},
        create: { ...a, role: "STUDENT" },
      }),
    ),
  );

  // Limpa slots de seed anteriores para tornar o script idempotente.
  await prisma.slot.deleteMany({ where: { note: "seed" } });

  // Gera 6 slots de 30 min a partir de amanhã 09:00 (UTC).
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + 1);
  base.setUTCHours(12, 0, 0, 0); // ~09:00 em UTC-3

  const slots: Slot[] = [];
  for (let i = 0; i < 6; i++) {
    const slot = await prisma.slot.create({
      data: {
        startsAt: new Date(base.getTime() + i * 30 * 60_000),
        durationMin: 30,
        location: "Sala A1",
        note: "seed",
      },
    });
    slots.push(slot);
  }

  // Reserva o primeiro slot para o João, com auditoria.
  await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.create({
      data: { slotId: slots[0].id, studentId: alunos[0].id },
    });
    await tx.auditLog.create({
      data: {
        actorId: alunos[0].id,
        actorEmail: alunos[0].email,
        actorRole: "STUDENT",
        action: "RESERVATION_CREATED",
        targetType: "reservation",
        targetId: reservation.id,
        details: { slotId: slots[0].id, seeded: true },
      },
    });
  });

  console.log("Seed concluído:");
  console.log(`  professor: ${professor.email}`);
  console.log(`  alunos: ${alunos.map((a) => a.email).join(", ")}`);
  console.log(`  slots: ${slots.length} (1 reservado por ${alunos[0].email})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Erro no seed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
