# Progresso — SAPO

Acompanha o roteiro de implementação definido em `claude.md`. Atualizar a cada etapa concluída.

## Status

- [x] **Etapa 1 — Setup**: Next.js 16 (App Router, TS) + Tailwind + ESLint, gerenciado com **pnpm** (não npm/yarn). Sem repositório Git ainda (criar quando o usuário pedir).
- [x] **Etapa 2 — Auth UFRN (Google OAuth)**: Auth.js v5 (`next-auth@beta`) + `@auth/prisma-adapter`, sessão em banco, restrição de domínio e papel de professor implementadas.
- [x] **Etapa 3 — Modelo de dados completo**: models `Slot`, `Reservation`, `AuditLog` + relações reversas em `User`. Migration `init` (todas as tabelas) gerada offline via `prisma migrate diff` em `prisma/migrations/<ts>_init/`. Ainda **não aplicada** (sem Postgres acessível) — aplicar com `prisma migrate deploy` quando houver `DATABASE_URL` real.
- [x] **Etapa 4 — CRUD de slots (professor) + criação em lote**: Server Actions (`src/lib/server/slots.ts`) para criar (individual e em lote), editar e excluir slots — todas com `requireProfessor` + transação atômica ação+auditoria. Tela `/professor/slots` (Tailwind puro): formulários de criação, listagem com edição inline e exclusão (confirma impacto se houver reserva). Helper de auditoria reusável (`src/lib/audit.ts`) e timezone (`src/lib/datetime.ts`, armazena UTC / exibe UTC-3) criados. `zod` adicionado para validação de input.
- [x] **Etapa 5 — Listagem de slots (aluno) livre/ocupado**: página `/slots` (read-only, `requireUserPage`) listando todos os slots agrupados por dia (UTC-3), com estado Livre / Ocupado (nome de quem reservou — transparência) / Sua reserva (destaque). Aviso no topo se o aluno já tem reserva ativa (regra 1-por-aluno). Botões Reservar/Cancelar ficam para a Etapa 6.
- [x] **Etapa 6 — Reserva/cancelamento com transação + 1-por-aluno + concorrência**: Server Actions `reserveSlotAction` / `cancelReservationAction` (`src/lib/server/reservations.ts`), atômicas (ação + auditoria na mesma tx). Concorrência garantida pelas constraints UNIQUE: `slotId` (2 alunos no mesmo slot → P2002 → "horário já reservado") e `studentId` (1 reserva ativa por aluno → P2002 → "você já tem uma reserva"). Cancelamento autoriza dono OU professor (force-cancel com auditoria `RESERVATION_FORCED_CANCEL`). Bloqueia reservar slots passados. UI: botões Reservar/Cancelar em `/slots` + página `/minha-reserva`. **Teste de corrida real → Etapa 9** (precisa de banco).
- [x] **Etapa 7 — Camada de auditoria (escrita em toda mutação)**: `writeAudit` já é chamado em todas as mutações (slots + reservas). Evento `LOGIN` registrado no `events.signIn` do Auth.js. Captura de `ip`/`user_agent` via `src/lib/request-meta.ts` (`getRequestMeta`) em todas as actions e no login. Cobertura consolidada: SLOT_CREATED/BATCH/UPDATED/DELETED, RESERVATION_CREATED/CANCELLED/FORCED_CANCEL, LOGIN.
- [x] **Etapa 8 — Telas de auditoria**: professor `/professor/auditoria` (filtros por ator/ação/target/intervalo de datas, paginação 50/pág, export CSV via `GET /professor/auditoria/export` com BOM p/ Excel). Aluno `/historico` (só ações dele: `actorId = ele` OU reserva-alvo dele via filtro no `details` JSON — force-cancel do professor e exclusão de slot reservado). Lógica de query/CSV compartilhada em `src/lib/audit-query.ts`.
- [x] **Etapa 9 — Autorização e testes de concorrência** (parcial — teste escrito, falta rodar com banco): Autorização revisada e confirmada server-side em TODAS as mutações e páginas (slots→`requireProfessor`; reservas→`requireUser`+dono/professor; páginas com guards; export CSV idem). Lógica de reserva extraída para `src/lib/reservations-core.ts` (injeção de client, reusada por actions e testes). Teste de corrida `scripts/concurrency-test.ts` (`pnpm test:concurrency`) e seed `scripts/seed.ts` (`pnpm db:seed`) criados — **carregam OK via tsx** (aliases/esbuild resolvidos), mas só executam contra um Postgres real (hoje falham em ECONNREFUSED). Navegação por papel (`src/components/nav.tsx`), home redireciona por papel, metadata corrigida.
- [ ] Etapa 10 — Deploy

> Fluxo de trabalho acordado: antes de codar cada etapa, descrever o plano e esperar OK do usuário. Não pular etapas.

## Decisões técnicas já tomadas

- **Gerenciador de pacotes**: pnpm (ambiente alterna entre Windows e Linux; pnpm funciona em ambos).
- **Prisma 7**: o gerador padrão (`prisma-client`) agora exige **driver adapter** explícito — não lê `DATABASE_URL` implicitamente no client. Configurado com `@prisma/adapter-pg` + `pg` em `src/lib/prisma.ts`. O `prisma.config.ts` (usado pela CLI para migrations) ainda usa `DATABASE_URL` direto.
- **Auth.js v5**: sessões em banco (`session.strategy = "database"`), não JWT — combina com a necessidade de auditoria por `actor_id`.
- **Restrição de domínio**: não confia no claim `hd` do Google; valida o e-mail verificado no callback `signIn` via `src/lib/email-domain.ts` (`isAllowedEmailDomain`), configurável por `ALLOWED_EMAIL_DOMAINS`.
- **Papel de professor**: lista de e-mails em `PROFESSOR_EMAILS`; promovido a `PROFESSOR` no evento `createUser` do Auth.js.
- **Magic link por e-mail**: adiado (decisão do usuário) — só Google OAuth por enquanto, para não depender de um provedor de envio de e-mail (Resend/SMTP) configurado.

## Arquivos-chave já criados

- `prisma/schema.prisma` — models `User`, `Account`, `Session`, `VerificationToken`, `Slot`, `Reservation`, `AuditLog` (+ enum `Role`). Reserva ativa-única: `Reservation.slotId @unique` (1 reserva por slot) + `Reservation.studentId @unique` (1 reserva ativa por aluno); cancelamento = delete + audit log. `AuditLog` append-only, `actorId` com `onDelete: SetNull` (log sobrevive à remoção do usuário).
- `prisma/migrations/<ts>_init/migration.sql` — migration inicial com todas as tabelas, constraints de unicidade e FKs.
- `src/lib/audit.ts` — `writeAudit(tx, ...)` (escreve audit_log DENTRO da transação), enum `AuditAction`, `toAuditActor`. Append-only.
- `src/lib/datetime.ts` — `localInputToUtc` / `formatUfrn` / `utcToLocalInput` (UTC ↔ UTC-3, fuso America/Recife).
- `src/lib/server/slots.ts` — Server Actions `createSlotAction`, `createBatchAction`, `updateSlotAction`, `deleteSlotAction` (autorização + transação + auditoria).
- `src/lib/auth.ts` — helper de página `requireProfessorPage` (redirect em vez de throw).
- `src/app/professor/slots/` — página + componentes cliente (`create-forms`, `slot-table`, `feedback`).
- `src/app/slots/page.tsx` — listagem do aluno (livre/ocupado/sua-reserva, agrupada por dia, UTC-3).
- `src/lib/auth.ts` — `requireUserPage` (guard de página para qualquer autenticado).
- `src/lib/datetime.ts` — + `ufrnDayKey`, `formatUfrnDayLabel`, `formatUfrnTime` (agrupar/exibir por dia em UTC-3).
- `src/lib/server/reservations.ts` — Server Actions `reserveSlotAction` / `cancelReservationAction` (transação + autorização + auditoria + tratamento de P2002).
- `src/app/slots/_components/` — `reserve-button`, `cancel-button` (client, `useActionState`).
- `src/app/minha-reserva/page.tsx` — detalhes da reserva ativa + cancelar.
- `src/lib/request-meta.ts` — `getRequestMeta` (ip/user-agent dos headers para a auditoria).
- `src/auth.ts` — evento `signIn` registra `LOGIN` na auditoria.
- `src/lib/audit-query.ts` — filtros (`buildAuditWhere`, `buildStudentAuditWhere`), `parseAuditFilters`, serialização CSV (`auditRowsToCsv`).
- `src/app/professor/auditoria/` — página de auditoria do professor + route handler `export/route.ts` (CSV).
- `src/app/historico/page.tsx` — histórico do aluno (auditoria filtrada às próprias ações).
- `src/lib/reservations-core.ts` — lógica de reserva/cancelamento (injeção de client), reusada por actions e testes.
- `scripts/concurrency-test.ts` — teste de corrida (`pnpm test:concurrency`). `scripts/seed.ts` — seed (`pnpm db:seed`).
- `src/components/nav.tsx` — navegação por papel. `src/app/page.tsx` — home redireciona por papel.
- `src/auth.ts` — config do Auth.js (provider Google, callbacks de domínio/role).
- `src/lib/prisma.ts` — singleton do Prisma Client com driver adapter `pg`.
- `src/lib/email-domain.ts` — `isAllowedEmailDomain`, `isProfessorEmail`.
- `src/lib/auth.ts` — helpers `getCurrentUser`, `requireUser`, `requireProfessor` (reusar nas próximas mutations).
- `src/app/login/page.tsx` — página de login (Google).
- `src/app/api/auth/[...nextauth]/route.ts` — route handler do Auth.js.
- `.env.example` — variáveis documentadas (`DATABASE_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ALLOWED_EMAIL_DOMAINS`, `PROFESSOR_EMAILS`).

## Pendente para o login funcionar de fato

1. Criar um banco PostgreSQL (local, Neon ou Supabase) e preencher `DATABASE_URL` no `.env`.
2. Rodar `pnpm dlx prisma migrate dev` para criar as tabelas.
3. Criar credenciais OAuth no Google Cloud Console e preencher `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
4. Gerar `AUTH_SECRET` (`npx auth secret` ou `openssl rand -base64 33`).
5. O fluxo OAuth completo ainda **não foi testado de ponta a ponta** (faltam as credenciais acima).

## Validações já feitas

- `pnpm build`, `pnpm exec tsc --noEmit` e `pnpm lint` passando sem erros.
- Dev server respondendo 200 em `/login` (renderização confirmada; OAuth real não testado).
