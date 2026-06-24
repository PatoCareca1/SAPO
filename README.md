# SAPO — Sistema de Agendamento de Provas do Prof. Anderson

Aplicação web para o Prof. Anderson agendar provas orais com alunos da UFRN,
com reserva concorrente segura e **auditoria** completa de todas as ações.

- Especificação completa: [`claude.md`](./claude.md)
- Status de implementação por etapa: [`PROGRESS.md`](./PROGRESS.md)

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS · Prisma 7 + PostgreSQL ·
Auth.js v5 (Google OAuth restrito aos domínios UFRN). Gerenciador de pacotes:
**pnpm**.

---

## Branches e ambientes

O **código é o mesmo em todos os ambientes** — o que muda é só a configuração
(principalmente `DATABASE_URL`), via variáveis de ambiente. Banco **não** é
definido por branch.

| Branch | Papel | Ambiente / Banco |
|--------|-------|------------------|
| `main` | Estável / produção | Produção (env vars na plataforma) |
| `homolog` | Pré-produção / demo | Supabase (env vars na plataforma) |
| `dev` | Integração | Local — Postgres via Docker (`.env`) |

- Feature branches saem de `dev`.
- O mapeamento branch→ambiente acontece no **deploy** (ex.: Vercel: `homolog`→
  preview/homolog, `main`→produção), nunca em config commitada.
- `.env` é **gitignored**; cada ambiente tem o seu (local no arquivo, nuvem nas
  variáveis da plataforma). Só `.env.example` é versionado.
- **Supabase:** se usar o pooler (pgbouncer, porta 6543), defina também
  `DIRECT_URL` (conexão direta, 5432) para as migrations — veja `.env.example`.

---

## Como rodar o protótipo (passo a passo)

### Pré-requisitos

- **Node.js 20+** (testado com 24) e **pnpm 11+** (`npm i -g pnpm`).
- Um **PostgreSQL** acessível (veja o Passo 2).

### Passo 1 — Instalar dependências

```bash
pnpm install
```

### Passo 2 — Ter um PostgreSQL

Escolha **uma** opção:

**Opção A — Neon (nuvem, sem instalar nada — recomendado p/ ver rápido)**
1. Crie uma conta grátis em <https://neon.tech> e um projeto.
2. Copie a *connection string* (algo como
   `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).

**Opção B — Supabase (nuvem)**
1. Crie um projeto em <https://supabase.com>.
2. Pegue a connection string em *Project Settings → Database* (use a porta 5432,
   modo *session*).

**Opção C — Docker local (recomendado para o ambiente `dev`)**
- Com o Docker Desktop instalado, suba o Postgres já configurado:
  ```bash
  docker compose up -d
  ```
- Isso casa com o `DATABASE_URL` padrão do `.env`
  (`postgresql://postgres:postgres@localhost:5432/sapo?schema=public`).
- Parar: `docker compose down` · Resetar dados: `docker compose down -v`.

**Opção D — PostgreSQL instalado na máquina**
- Crie um banco `sapo`; a URL fica
  `postgresql://postgres:SUASENHA@localhost:5432/sapo?schema=public`.

### Passo 3 — Configurar o `.env`

Copie o exemplo e edite:

```bash
cp .env.example .env
```

Preencha:

| Variável | O que é | Como obter |
|----------|---------|------------|
| `DATABASE_URL` | Conexão do Postgres | string do Passo 2 |
| `AUTH_SECRET` | Segredo de sessão do Auth.js | `npx auth secret` (gera e grava no `.env`) ou `openssl rand -base64 33` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciais OAuth | Passo 4 |
| `ALLOWED_EMAIL_DOMAINS` | Domínios aceitos (vírgula) | default `ufrn.edu.br,ufrn.br` (subdomínios entram automaticamente) |
| `PROFESSOR_EMAILS` | E-mails que entram como professor | seu e-mail de teste |

> ⚠️ **Para testar o login com um e-mail que NÃO é da UFRN** (ex.: um
> `@gmail.com`), adicione o domínio em `ALLOWED_EMAIL_DOMAINS` **só para
> desenvolvimento**, senão o login é bloqueado pela restrição institucional.
> Exemplo para testar como professor com sua conta Google:
> ```
> ALLOWED_EMAIL_DOMAINS="ufrn.edu.br,ufrn.br,gmail.com"
> PROFESSOR_EMAILS="seuemail@gmail.com"
> ```
> Lembre de **reverter** isso antes de ir para produção.

### Passo 4 — Credenciais Google OAuth

1. Acesse <https://console.cloud.google.com/apis/credentials>.
2. *Create Credentials → OAuth client ID → Web application*.
3. Em **Authorized redirect URIs**, adicione:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Copie o **Client ID** e **Client secret** para o `.env`.
5. Configure a *OAuth consent screen* (modo *Testing* já basta; adicione seu
   e-mail como *test user*).

### Passo 5 — Aplicar o schema no banco

```bash
pnpm dlx prisma migrate deploy   # aplica a migration já versionada
pnpm dlx prisma generate         # garante o Prisma Client atualizado
```

> Se for evoluir o schema depois, use `pnpm dlx prisma migrate dev`.

### Passo 6 — (Opcional) Popular com dados de exemplo

```bash
pnpm db:seed
```

Cria 1 professor, 3 alunos e 6 slots (1 já reservado), para as telas terem
conteúdo. *Observação:* o login real é via Google; o seed só cria as linhas no
banco. Para entrar como professor, faça login com um e-mail listado em
`PROFESSOR_EMAILS`.

### Passo 7 — Rodar

```bash
pnpm dev
```

Abra <http://localhost:3000>. Você cai no `/login` → "Entrar com Google".

---

## Navegando pelas telas

Após o login você é redirecionado conforme o papel:

| Papel | Vai para | Telas disponíveis (menu no topo) |
|-------|----------|----------------------------------|
| **Aluno** | `/slots` | Horários (`/slots`), Minha reserva (`/minha-reserva`), Meu histórico (`/historico`) |
| **Professor** | `/professor/slots` | Horários, Gerenciar slots (`/professor/slots`), Auditoria (`/professor/auditoria`), Meu histórico |

Fluxos para experimentar:
- **Professor**: criar slot individual e em lote; editar; excluir; ver auditoria
  com filtros; exportar CSV.
- **Aluno**: reservar um slot livre; tentar reservar um 2º (é bloqueado);
  cancelar; ver o próprio histórico.
- Todos os horários são exibidos em **UTC-3** (fuso da UFRN).

---

## Testes e verificação

```bash
pnpm exec tsc --noEmit   # type-check
pnpm lint                # ESLint
pnpm build               # build de produção
pnpm test:concurrency    # teste de corrida da reserva (exige DATABASE_URL + migration aplicada)
```

O `test:concurrency` prova as garantias de concorrência: dois alunos não
reservam o mesmo slot, e um aluno não tem duas reservas ativas.

---

## Comandos úteis

- `pnpm dev` — servidor de desenvolvimento
- `pnpm build` / `pnpm start` — produção
- `pnpm dlx prisma studio` — inspecionar o banco visualmente
- `pnpm dlx prisma migrate deploy` — aplicar migrations num banco
- `pnpm db:seed` — popular dados de exemplo
- `pnpm test:concurrency` — teste de corrida da reserva

---

## Garantias do projeto (resumo)

- **Auditoria**: toda criação/alteração/exclusão grava um registro append-only
  em `audit_log`, na **mesma transação** da ação.
- **Concorrência**: reserva é atômica; constraints UNIQUE garantem 1 reserva por
  slot e 1 reserva ativa por aluno.
- **Autorização**: validada no servidor em toda mutação e página.
- **Timezone**: armazenado em UTC, exibido em UTC-3.

## Limitações conhecidas (v1)

- Login apenas via Google OAuth (magic link por e-mail foi adiado).
- Sem notificações por e-mail além do fluxo de login.
- shadcn/ui não adotado — UI em Tailwind puro.
- Deploy (Etapa 10) ainda não realizado.
