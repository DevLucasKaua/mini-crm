# Build a partir da RAIZ do monorepo:
#   docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS base
# openssl é exigido pelos engines do Prisma em alpine
RUN apk add --no-cache openssl && corepack enable
WORKDIR /app

# ---- build: instala workspace, compila shared-types + api ----
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter api...

COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN pnpm --filter @mini-crm/shared-types build \
  && pnpm --filter api exec prisma generate \
  && pnpm --filter api build

# gera uma pasta autocontida só com deps de produção
# (exige injectWorkspacePackages: true no pnpm-workspace.yaml)
RUN pnpm --filter api deploy --prod /prod/api
# o client do Prisma precisa ser gerado DENTRO do node_modules deployado
WORKDIR /prod/api
RUN ./node_modules/.bin/prisma generate

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /prod/api ./
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
