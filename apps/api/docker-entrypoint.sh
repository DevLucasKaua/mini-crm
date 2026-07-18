#!/bin/sh
set -e

# o prisma spawna comandos do seed (tsx) pelo nome; garante os binários locais no PATH
export PATH="/app/node_modules/.bin:$PATH"

echo "[entrypoint] aplicando migrações..."
prisma migrate deploy

echo "[entrypoint] rodando seed (idempotente)..."
prisma db seed

echo "[entrypoint] iniciando API..."
exec node dist/main.js
