import "dotenv/config";

import { prisma } from "@/lib/prisma";
import { reserveSlotCore } from "@/lib/reservations-core";
import type { AuditActor } from "@/lib/audit";

// Teste de corrida da regra de reserva (Etapa 9). Requer um Postgres real
// acessível via DATABASE_URL e a migration aplicada (`prisma migrate deploy`).
//
//   pnpm test:concurrency
//
// Verifica:
//   1) Dois alunos disputando o MESMO slot -> exatamente 1 sucesso, o outro
//      recebe SLOT_TAKEN (constraint UNIQUE(slotId)).
//   2) Um aluno tentando reservar DOIS slots ao mesmo tempo -> exatamente 1
//      sucesso, o outro recebe ALREADY_RESERVED (constraint UNIQUE(studentId)).

const A = "race.a@ufrn.br";
const B = "race.b@ufrn.br";

function actor(id: string, email: string): AuditActor {
  return { id, email, role: "STUDENT" };
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { in: [A, B] } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await prisma.reservation.deleteMany({ where: { studentId: { in: ids } } });
  }
  await prisma.auditLog.deleteMany({ where: { actorEmail: { in: [A, B] } } });
  await prisma.slot.deleteMany({ where: { note: "concurrency-test" } });
  await prisma.user.deleteMany({ where: { email: { in: [A, B] } } });
}

async function main() {
  let failures = 0;
  const check = (name: string, cond: boolean, extra?: unknown) => {
    if (cond) {
      console.log(`  ✅ ${name}`);
    } else {
      failures++;
      console.error(`  ❌ ${name}`, extra ?? "");
    }
  };

  await cleanup();

  const future = new Date(Date.now() + 24 * 3600_000);
  const userA = await prisma.user.create({
    data: { email: A, name: "Aluno A", role: "STUDENT" },
  });
  const userB = await prisma.user.create({
    data: { email: B, name: "Aluno B", role: "STUDENT" },
  });

  // ----- Teste 1: dois alunos, mesmo slot -----
  console.log("Teste 1 — dois alunos disputando o mesmo slot:");
  const slot1 = await prisma.slot.create({
    data: { startsAt: future, durationMin: 30, note: "concurrency-test" },
  });

  const [r1a, r1b] = await Promise.all([
    reserveSlotCore(prisma, {
      slotId: slot1.id,
      studentId: userA.id,
      actor: actor(userA.id, A),
    }),
    reserveSlotCore(prisma, {
      slotId: slot1.id,
      studentId: userB.id,
      actor: actor(userB.id, B),
    }),
  ]);

  const oks1 = [r1a, r1b].filter((r) => r.ok).length;
  const taken1 = [r1a, r1b].filter((r) => !r.ok && r.code === "SLOT_TAKEN").length;
  check("exatamente 1 reserva confirmada", oks1 === 1, { r1a, r1b });
  check("o outro recebeu SLOT_TAKEN", taken1 === 1, { r1a, r1b });

  const count1 = await prisma.reservation.count({ where: { slotId: slot1.id } });
  check("apenas 1 linha de reserva no banco", count1 === 1, { count1 });

  // ----- Teste 2: um aluno, dois slots ao mesmo tempo -----
  console.log("Teste 2 — um aluno tentando reservar dois slots de uma vez:");
  // Libera o aluno A (cancela a reserva do teste 1, se foi dele).
  await prisma.reservation.deleteMany({ where: { studentId: userA.id } });

  const slot2 = await prisma.slot.create({
    data: { startsAt: future, durationMin: 30, note: "concurrency-test" },
  });
  const slot3 = await prisma.slot.create({
    data: { startsAt: future, durationMin: 30, note: "concurrency-test" },
  });

  const [r2a, r2b] = await Promise.all([
    reserveSlotCore(prisma, {
      slotId: slot2.id,
      studentId: userA.id,
      actor: actor(userA.id, A),
    }),
    reserveSlotCore(prisma, {
      slotId: slot3.id,
      studentId: userA.id,
      actor: actor(userA.id, A),
    }),
  ]);

  const oks2 = [r2a, r2b].filter((r) => r.ok).length;
  const already2 = [r2a, r2b].filter(
    (r) => !r.ok && r.code === "ALREADY_RESERVED",
  ).length;
  check("exatamente 1 reserva confirmada", oks2 === 1, { r2a, r2b });
  check("o outro recebeu ALREADY_RESERVED", already2 === 1, { r2a, r2b });

  const count2 = await prisma.reservation.count({
    where: { studentId: userA.id },
  });
  check("aluno tem no máximo 1 reserva ativa", count2 === 1, { count2 });

  await cleanup();

  console.log("");
  if (failures === 0) {
    console.log("✅ Todos os testes de concorrência passaram.");
  } else {
    console.error(`❌ ${failures} verificação(ões) falharam.`);
  }
  return failures;
}

main()
  .then(async (failures) => {
    await prisma.$disconnect();
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch(async (err) => {
    console.error("Erro ao executar o teste:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
