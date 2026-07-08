-- ─────────────────────────────────────────────────────────────────────────────
-- Círculo Tequila · Espejo SQL de la base ACTUAL de NocoDB
--
-- NocoDB no exporta un "script de creación" nativo (la base se arma desde su UI).
-- Esto es el EQUIVALENTE en SQL: recrea las mismas tablas/columnas que hoy existen
-- en NocoDB, con los nombres tal cual (acentos incluidos: `campaña`, `propósito`).
--
-- ⚠️ Reconstruido a partir de docs/DATA_MAP.md, no de un dump en vivo. Para el
--    esquema EXACTO de la instancia, reconectar el MCP de NocoDB/n8n y lo dumpeo.
-- Nota: los nombres con ñ/acento son justo los que rompen el "create" del nodo
--    n8n; para la base nueva ver sql/supabase_schema.sql (snake_case limpio).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tabla LEADS ───────────────────────────────────────────────────────────────
create table if not exists "Leads" (
  "id"               bigint generated always as identity primary key,
  "lead_id"          text unique,                 -- L-####
  "nombre"           text,
  "canal"            text,                        -- whatsapp, web…
  "linea"            text,                        -- empresarial, turismo, retail, amazon
  "campaña"          text,                        -- campana_gdl, web_general…
  "anuncio"          text,
  "ciudad"           text,
  "ciudad_validada"  text,
  "botellas"         integer,
  "propósito"        text,                        -- evento, amenidad, regalo…
  "estatus_mkt"      text,                        -- vocabulario de Kenia (§13)
  "etapa"            text,                        -- nuevo…produccion + perdido
  "tier"             text,                        -- A/B/C/D
  "score"            integer,                     -- 0–100
  "tipo_lead"        text,
  "contexto"         text,                        -- resumen que viaja a ventas
  "owner"            text,                        -- agente / vendedor
  "requalify_at"     date,
  "fecha"            timestamptz default now()
);

-- ── Tabla MENSAJES (bitácora de la conversación) ──────────────────────────────
create table if not exists "Mensajes" (
  "id"          bigint generated always as identity primary key,
  "lead_id"     text,                             -- FK lógica → Leads.lead_id
  "ts"          timestamptz default now(),
  "canal"       text,
  "emisor"      text,                             -- cliente / agente
  "etiqueta"    text,                             -- respuesta_agente, toque…
  "texto"       text
);

-- ── Tabla SIGNAL_LOG (bitácora append-only de scoring, §13) ───────────────────
-- (esquema alterno que también lee el dashboard: valor/detalle, tipo, actor)
create table if not exists "Signal_log" (
  "id"            bigint generated always as identity primary key,
  "lead_id"       text,
  "ts"            timestamptz default now(),
  "tipo"          text,                           -- toque / respuesta / señal
  "plantilla_id"  text,                           -- M1–M5 / SEG
  "canal"         text,
  "valor/detalle" text,
  "actor"         text
);

create index if not exists idx_leads_campana on "Leads" ("campaña");
create index if not exists idx_leads_etapa   on "Leads" ("etapa");
create index if not exists idx_mensajes_lead on "Mensajes" ("lead_id");
create index if not exists idx_signal_lead   on "Signal_log" ("lead_id");
