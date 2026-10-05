#!/bin/bash
# Levanta PostgreSQL + PostgREST locales con el esquema de OdontoApp (para probar RLS y sincronización de verdad).
# Requiere: postgresql (apt) y el binario `postgrest` (github.com/PostgREST/postgrest/releases). Uso: PGREST_BIN=/ruta/postgrest bash tests/pg/start.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"; ROOT="$DIR/../.."
PGREST_BIN="${PGREST_BIN:-postgrest}"
pg_lsclusters | grep -q online || pg_ctlcluster 16 main start
pkill -f "postgrest /tmp/pgrst.conf" 2>/dev/null || true
sleep 2
su postgres -c "psql -qc 'drop database if exists odonto with (force)'" 
su postgres -c "psql -qc 'create database odonto'"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d odonto -f $DIR/auth_stub.sql"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d odonto -f $ROOT/supabase/schema.sql"
cat > /tmp/pgrst.conf <<CONF
db-uri = "postgres://authenticator:test@127.0.0.1:5432/odonto"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "super-secreto-de-prueba-de-32-caracteres-minimo!!"
server-port = 3100
CONF
pkill -f "postgrest /tmp/pgrst.conf" 2>/dev/null || true
nohup "$PGREST_BIN" /tmp/pgrst.conf > /tmp/pgrst.log 2>&1 &
sleep 2; curl -s -o /dev/null -w "PostgREST HTTP %{http_code}\n" http://127.0.0.1:3100/
