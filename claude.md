# SAPO — Sistema de Agendamento de Provas do Prof. Anderson

## Visão geral

Aplicação web para o Prof. Anderson agendar provas orais (slots de ~30 min) com alunos da UFRN. Substitui uma planilha do Google, eliminando erros de concorrência e dando rastreabilidade total (auditoria) de todas as ações.

**Palavra-chave do projeto: AUDITORIA.** Toda criação, alteração e exclusão é registrada com autor, data e hora, e é consultável.

---

## Atores e papéis

| Papel | Quem | Permissões |
|-------|------|------------|
| **Professor** (admin) | Prof. Anderson (e-mails autorizados) | Criar/editar/excluir slots; ver e gerenciar todas as reservas; ver auditoria completa; gerenciar lista de admins |
| **Aluno** | Qualquer e-mail institucional UFRN | Ver slots; reservar 1 slot; cancelar a própria reserva; ver o próprio histórico de auditoria |

### Regra de e-mail institucional
- Apenas e-mails dos domínios UFRN são aceitos: `@ufrn.edu.br`, `@ufrn.br` e subdomínios (ex.: `@academico.ufrn.br`, `@alunos.ufrn.edu.br`).
- Validação por **regex de domínio** + **verificação de e-mail** (link mágico ou OAuth Google restrito ao domínio). Não confiar apenas no formato — confirmar posse do e-mail.
- A lista de domínios aceitos fica em config/env, fácil de ajustar.

---

## Regras de negócio (núcleo)

1. **Slot** = janela de horário criada pelo professor (início, duração, opcionalmente local/observação).
2. Professor cria **vários** slots de uma vez ou individualmente.
3. Aluno vê todos os slots: **livres** e **ocupados** (com o nome de quem ocupou — transparência).
4. **Reserva**:
   - Aluno só pode ter **1 reserva ativa por vez**.
   - Para reservar outro horário, precisa **cancelar** o atual primeiro.
   - Ao reservar, o slot fica **travado**: só o **próprio aluno** ou o **professor** podem alterar/cancelar.
5. **Concorrência**: dois alunos não podem reservar o mesmo slot. Reserva é uma operação atômica (transação + constraint de unicidade no banco). O segundo recebe erro claro ("horário já reservado").
6. **Cancelamento** libera o slot, que volta a ficar livre para outros.
7. Professor pode **forçar** alterações/cancelamentos em qualquer reserva (com registro em auditoria).
8. Professor pode **excluir um slot**; se houver reserva, exige confirmação e registra o impacto na auditoria (e idealmente notifica o aluno).

---

## Auditoria (requisito central)

Toda ação relevante gera um **registro imutável** em uma tabela `audit_log`:

Campos:
- `id`
- `timestamp` (UTC, com timezone; exibir em America/Recife/Fortaleza — UFRN é UTC-3)
- `actor_id` / `actor_email` (quem fez)
- `actor_role` (aluno/professor)
- `action` (enum: `SLOT_CREATED`, `SLOT_UPDATED`, `SLOT_DELETED`, `RESERVATION_CREATED`, `RESERVATION_CANCELLED`, `RESERVATION_FORCED_CANCEL`, `LOGIN`, `ADMIN_ADDED`, etc.)
- `target_type` (slot/reservation/user)
- `target_id`
- `details` (JSON com before/after quando aplicável)
- `ip` / `user_agent` (opcional, mas útil)

Regras:
- Registros de auditoria **nunca** são editados ou apagados pela aplicação (append-only).
- **Professor**: vê o log completo, com filtros (por aluno, por slot, por tipo de ação, por intervalo de datas) e exportação (CSV).
- **Aluno**: vê apenas as ações em que ele é o `actor` ou cujo `target` é uma reserva dele.

---

## Telas / Fluxos

### Públicas
- **Login** — entrar com e-mail institucional (link mágico ou Google OAuth restrito ao domínio).

### Aluno
- **Lista de slots** — calendário/lista com livres e ocupados; botão "Reservar" nos livres; destaque da própria reserva.
- **Minha reserva** — detalhes do horário reservado + botão "Cancelar".
- **Meu histórico** — auditoria filtrada às próprias ações.

### Professor
- **Dashboard** — visão geral (total de slots, ocupados, livres, próximos horários).
- **Gerenciar slots** — criar (individual e em lote: intervalo + duração → gera slots), editar, excluir.
- **Reservas** — tabela de todas as reservas; cancelar/reatribuir.
- **Auditoria** — log completo com filtros e export CSV.
- **Admins** — adicionar/remover e-mails de professor.

---

## Stack sugerida

Escolha pragmática, fácil de hospedar e com bom suporte a auth + transações:

- **Frontend + Backend**: Next.js (App Router, TypeScript) — full-stack num só projeto.
- **Banco**: PostgreSQL (constraints e transações são essenciais para a regra de concorrência).
- **ORM**: Prisma.
- **Auth**: NextAuth/Auth.js com provider Google (restrição de domínio `hd`) **e/ou** e-mail (magic link). Restrição de domínio reforçada no callback de `signIn`.
- **UI**: Tailwind CSS + shadcn/ui.
- **Deploy**: Vercel (app) + Neon/Supabase (Postgres). Tudo com free tier.

> Se preferir algo ainda mais simples de operar, Supabase (Postgres + Auth + RLS) também atende muito bem e o RLS ajuda a impor as permissões no nível do banco.

---

## Modelo de dados (Prisma — esboço)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(STUDENT)
  createdAt DateTime @default(now())
  reservations Reservation[]
  auditLogs    AuditLog[]
}

enum Role {
  STUDENT
  PROFESSOR
}

model Slot {
  id          String   @id @default(cuid())
  startsAt    DateTime
  durationMin Int      @default(30)
  location    String?
  note        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  reservation Reservation?
}

model Reservation {
  id        String   @id @default(cuid())
  slotId    String   @unique          // garante 1 reserva por slot
  studentId String
  createdAt DateTime @default(now())
  slot      Slot     @relation(fields: [slotId], references: [id], onDelete: Cascade)
  student   User     @relation(fields: [studentId], references: [id])

  @@unique([studentId])               // garante 1 reserva ativa por aluno
}

model AuditLog {
  id         String   @id @default(cuid())
  timestamp  DateTime @default(now())
  actorId    String?
  actorEmail String
  actorRole  Role
  action     String
  targetType String?
  targetId   String?
  details    Json?
  ip         String?
  userAgent  String?
  actor      User?    @relation(fields: [actorId], references: [id])

  @@index([timestamp])
  @@index([actorEmail])
}
```

> A reserva ativa única por aluno é modelada com `@@unique([studentId])`. Para histórico de reservas passadas (canceladas), mover reservas canceladas para o `AuditLog` em vez de mantê-las na tabela `Reservation`, ou adicionar um campo `status` + índice único parcial (`WHERE status = 'ACTIVE'`).

---

## Garantias técnicas críticas

1. **Concorrência na reserva**: usar transação com `SELECT ... FOR UPDATE` no slot ou confiar na constraint `Reservation.slotId @unique` — capturar a violação e retornar 409 "horário já reservado".
2. **Autorização server-side**: nunca confiar no front. Toda mutação valida o papel e a posse (aluno só mexe na própria reserva).
3. **Auditoria atômica**: o registro de auditoria é escrito **na mesma transação** da ação, para nunca haver ação sem log nem log sem ação.
4. **Timezone**: armazenar UTC, exibir UTC-3.
5. **Idempotência/erros**: mensagens claras para "você já tem uma reserva", "horário indisponível", "sem permissão".

---

## Não-objetivos (fora do escopo v1)

- Pagamentos.
- Múltiplos professores/turmas (apenas Prof. Anderson; mas o modelo `role` já permite evoluir).
- Notificações por e-mail além do magic link (deixar como melhoria futura).
- App mobile nativo (web responsivo basta).

---

## Roadmap de implementação

1. Setup: Next.js + TS + Tailwind + Prisma + Postgres.
2. Auth com restrição de domínio UFRN.
3. Modelo de dados + migrations.
4. CRUD de slots (professor) + criação em lote.
5. Listagem de slots (aluno) com estado livre/ocupado.
6. Reserva/cancelamento com transação e regra de 1-por-aluno.
7. Camada de auditoria (escrita em toda mutação).
8. Telas de auditoria (professor completa, aluno própria).
9. Autorização e testes de concorrência.
10. Deploy.

---

## Critérios de aceite (v1)

- [ ] Apenas e-mails UFRN verificados entram.
- [ ] Professor cria slots individuais e em lote.
- [ ] Aluno reserva 1 slot; tentativa de 2º é bloqueada.
- [ ] Slot reservado é visível a todos e só editável pelo dono ou professor.
- [ ] Cancelar libera o slot.
- [ ] Dois alunos não reservam o mesmo slot (teste de corrida passa).
- [ ] Toda ação aparece na auditoria com autor, data e hora.
- [ ] Professor vê auditoria completa com filtros e export CSV.
- [ ] Aluno vê apenas a própria auditoria.
