# Mini-CRM WhatsApp

CRM multiatendimento por unidade (matriz/filial) integrado ao WhatsApp: cada unidade pareia um número via QR code, mensagens recebidas caem num inbox em tempo quase real e um bot responde à saudação inicial. Acesso via login Google, com isolamento total de dados entre unidades.

> ⚠️ **Aviso**: a integração usa [Baileys](https://github.com/WhiskeySockets/Baileys) (WhatsApp Web não oficial), o que viola os Termos de Serviço do WhatsApp. Use um **número descartável** — há risco real de banimento.

## Stack

| Camada | Tecnologia |
|---|---|
| API | NestJS 11 + TypeScript |
| Banco | PostgreSQL 16 + Prisma |
| WhatsApp | Baileys 6.7.23 (pin exato) |
| Auth | Firebase Authentication (Google) — ID token verificado no backend com firebase-admin |
| Frontend | Vite 8 + React 19 + react-router 8 |
| Monorepo | pnpm workspaces (`apps/api`, `apps/web`, `packages/shared-types`) |
| Infra | Docker multi-stage + docker-compose; frontend no Firebase Hosting |

## Arquitetura

```
apps/
  api/          NestJS: auth (guard global), conversas, whatsapp (Baileys), prisma
  web/          React SPA: login Google, inbox (polling 5s), conexão QR (polling 2,5s)
packages/
  shared-types/ DTOs compartilhados entre api e web
```

- **Isolamento por unidade**: o `unitId` vem SEMPRE do usuário autenticado (resolvido do ID token); nenhum endpoint aceita `unitId` como input. Toda query de serviço filtra por `unitId`; acessar conversa de outra unidade responde 404.
- **Auth**: o frontend envia o ID token do Firebase como `Bearer`; o guard global verifica com `firebase-admin`, resolve o usuário por `firebaseUid` (com fallback por email e backfill do uid no primeiro login) e injeta `{ userId, unitId }` no request. Usuário sem unidade → 403.
- **Sessões WhatsApp**: uma por unidade (`Map<unitId, Session>`), credenciais em `WA_SESSION_DIR/<unitId>` (volume nomeado no Docker). Reconexão automática com backoff; `restartRequired` pós-pareamento recria o socket; `loggedOut` limpa a sessão.

## Rodando com Docker (recomendado para avaliação)

Pré-requisitos: Docker Desktop e um projeto Firebase (passos abaixo).

### 1. Configurar o Firebase (uma vez)

1. Crie um projeto no [console do Firebase](https://console.firebase.google.com).
2. **Authentication → Sign-in method**: habilite o provedor **Google**.
3. **Project Settings → Your apps → `</>` (Web)**: registre um app e copie a config (`apiKey`, `authDomain`, `projectId`, `appId`).
4. **Project Settings → Service accounts → Generate new private key**: salve o JSON como `apps/api/secrets/firebase-service-account.json`.

### 2. Variáveis de ambiente

```powershell
cp .env.example .env                      # raiz — usado pelo docker-compose
cp apps/web/.env.example apps/web/.env.local
```

- **`.env` (raiz)**: `FIREBASE_PROJECT_ID` + emails das duas contas Google (`SEED_USER_MATRIZ_EMAIL`, `SEED_USER_FILIAL_EMAIL`) — esses emails viram os usuários autorizados de cada unidade no seed.
- **`apps/web/.env.local`**: os 4 valores `VITE_FIREBASE_*` da config web + `VITE_API_URL` (default `http://localhost:3000`).

### 3. Subir

```powershell
docker compose up --build
```

O entrypoint aplica as migrações, roda o seed (idempotente) e sobe a API na porta 3000. Volumes nomeados preservam banco e sessões WhatsApp entre restarts.

### 4. Frontend

Em desenvolvimento: `pnpm install && pnpm dev:web` → http://localhost:5173.
Ou use a versão hospedada (seção Deploy) — ela espera a API local do compose no ar.

### 5. Parear o WhatsApp

Login com a conta da unidade → aba **Conexão** → **Conectar WhatsApp** → escanear o QR com o número descartável (WhatsApp → Aparelhos conectados). A sessão persiste; não é preciso escanear de novo a cada restart.

## Rodando em modo dev (sem compose)

```powershell
pnpm install
docker run -d --name minicrm-pg -e POSTGRES_USER=minicrm -e POSTGRES_PASSWORD=minicrm -e POSTGRES_DB=minicrm -p 5432:5432 postgres:16-alpine
cp apps/api/.env.example apps/api/.env    # e preencher
pnpm --filter api exec prisma migrate dev
pnpm seed
pnpm dev:api    # porta 3000
pnpm dev:web    # porta 5173
```

## Regra do bot de auto-resposta

Mensagem recebida cujo texto, após `trim()`, seja **exatamente `Oi`** (case-sensitive) recebe a resposta **`Oi! Aqui é o Atendente da E3`**, persistida como OUTBOUND. Variações (`oi`, `OI`, `Oi!`) não disparam o bot — a mensagem é apenas registrada no inbox.

Escopo do processamento de mensagens:
- Somente mensagens de texto diretas (1-para-1); grupos, status e newsletters são ignorados.
- Mensagens enviadas manualmente pelo próprio aparelho pareado (`fromMe`) também são registradas, como OUTBOUND.
- O atendente pode responder direto pelo CRM (composer no chat) — a mensagem sai pela sessão da unidade e fica registrada na conversa.
- Idempotência por `waMessageId` único: reentregas do Baileys não duplicam mensagens nem re-disparam o bot.
- Contas com privacidade de número (JID `@lid`): o telefone real é resolvido via `senderPn`.

## Decisões técnicas

- **PostgreSQL + Prisma**: dados fortemente relacionais (unidade → usuários/conversas → mensagens) com constraints de isolamento no schema (`@@unique([unitId, contactPhone])`), migrações versionadas e tipos gerados de ponta a ponta.
- **Polling em vez de WebSocket**: dentro do prazo, polling de 5s (inbox) e 2,5s (status/QR) entrega a experiência necessária com uma fração da complexidade — o intervalo de 2,5s inclusive absorve a rotação de ~60s do QR de graça.
- **Baileys 6.7.x pinado**: a 7.x ainda é release candidate. Dois gotchas relevantes tratados: os servidores rejeitam a versão de protocolo embutida (405) — resolvido com `fetchLatestBaileysVersion()` — e o pnpm 11 bloqueia a dependência git `libsignal` por política de supply-chain (`blockExoticSubdeps: false` documentado no `pnpm-workspace.yaml`).
- **Sessões Baileys em disco** (`useMultiFileAuthState`): simples e suficiente para uma instância; ver "o que faria diferente".

## Deploy

Frontend hospedado no **Firebase Hosting** (build de produção com `VITE_API_URL=http://localhost:3000`): a SPA hospedada chama a API local — `localhost` é exceção de secure-context nos navegadores Chromium, sem mixed-content. Ou seja, para avaliar a versão hospedada basta ter o `docker compose up` rodando na própria máquina.

> ⚠️ **Permissão de rede local**: os navegadores Chromium recentes restringem sites públicos de acessar `localhost` ("Local Network Access"). No Chrome/Edge, **clique em Permitir** quando o navegador perguntar se o site pode acessar a rede local. Se não houver prompt e as chamadas falharem (erro "A API está no ar?"), habilite a permissão nas configurações do site ou desative a checagem em `chrome://flags` → "Local Network Access Checks". Em `http://localhost:5173` (dev) a restrição não se aplica.

- URL do deploy: **https://mini-crm-af51d.web.app**
- Deploy manual: `pnpm --filter web build && firebase deploy --only hosting` (dentro de `apps/web`, autenticado com `firebase login`).

## Evoluções após a entrega original

Itens do "o que eu faria diferente" que já foram implementados em sprints seguintes:

- ✅ **Envio de mensagens pelo CRM** (composer no chat) e **registro das mensagens `fromMe`** digitadas no aparelho.
- ✅ **Testes automatizados** (vitest): handler de mensagens (filtros, idempotência, gatilho exato do bot) e service de conversas (isolamento por unidade).
- ✅ **Redesign completo** com temas claro/escuro, dashboard de indicadores por unidade e desconexão do WhatsApp pela interface.

## O que eu faria diferente com mais tempo

- **WebSocket/SSE** no lugar do polling para entrega instantânea de mensagens e status.
- **Auth state do Baileys no banco** (em vez de arquivos) para permitir múltiplas instâncias da API e failover.
- **Suporte a mídia** (imagens/áudio) e busca/paginação de conversas.
- **Turborepo** para cache de build no monorepo; **API no Cloud Run + Cloud SQL** para um deploy 100% gerenciado.
