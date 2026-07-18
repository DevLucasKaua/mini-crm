#!/bin/sh
set -e

echo "[entrypoint] aplicando migrações..."
./node_modules/.bin/prisma migrate deploy

echo "[entrypoint] rodando seed (idempotente)..."
./node_modules/.bin/prisma db seed

echo "[entrypoint] iniciando API..."
exec node dist/main.js
