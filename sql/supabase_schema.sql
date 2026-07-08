-- ─────────────────────────────────────────────────────────────────────────────
-- Círculo Tequila · Esquema de base de datos (Supabase / Postgres)
-- Migración desde NocoDB. Columnas limpias en snake_case (sin ñ/acentos) para
-- evitar el bug de create que rompía con `campaña` / `propósito`.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar TODO → Run.
-- Es idempotente (create ... if not exists), se puede re-correr sin romper.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tabla LEADS · la base maestra (una fila por lead, siempre completa) ────────
create table if not exists public.leads (
  id                bigint generated always as identity primary key,
  lead_id           text unique not null,          -- L-#### (clave de negocio)
  nombre            text,
  canal             text,                           -- whatsapp, web…
  linea             text,                           -- empresarial, turismo, retail, amazon
  campana           text,                           -- campana_gdl, campana_cdmx, web_general…
  anuncio           text,                           -- nombre/headline del anuncio
  ad_id             text,                           -- id real del anuncio en Meta (CTWA/Marketing API)
  ciudad            text,                           -- ciudad de la campaña
  ciudad_validada   text,                           -- ciudad confirmada por el cliente (ruteo a vendedor)
  botellas          integer,
  proposito         text,                           -- evento, amenidad, regalo…
  estatus_mkt       text,                           -- vocabulario de Kenia (§13)
  etapa             text,                           -- nuevo…produccion + perdido
  tier              text,                           -- A/B/C/D
  score             integer,                        -- 0–100
  tipo_lead         text,
  contexto          text,                           -- resumen que viaja a ventas
  owner             text,                           -- agente / vendedor
  requalify_at      date,                           -- fecha de reactivación
  fuente_atribucion text,                           -- ctwa / frase / ninguna (precedencia)
  fecha             timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.leads is 'Base maestra de leads (reemplaza los Sheets de Kenia). Una fila por lead, siempre completa.';

-- ── Tabla MENSAJES · bitácora (cada mensaje enviado/recibido) ──────────────────
create table if not exists public.mensajes (
  id        bigint generated always as identity primary key,
  lead_id   text not null references public.leads(lead_id) on delete cascade,
  ts        timestamptz not null default now(),
  canal     text,
  emisor    text,                                   -- cliente / agente
  etiqueta  text,                                   -- respuesta_agente, toque, señal…
  texto     text
);

comment on table public.mensajes is 'Bitácora de la conversación por lead (cliente + agente).';

-- ── Tabla ANUNCIOS · caché de la Marketing API (anuncios activos) ──────────────
create table if not exists public.anuncios (
  id             bigint generated always as identity primary key,
  ad_id          text unique not null,              -- id del anuncio en Meta
  nombre         text,
  campana        text,
  estado         text,                              -- ACTIVE / PAUSED
  texto_creativo text,                              -- copy del anuncio (match por frase)
  gasto          numeric,
  clics          integer,
  cpl            numeric,                            -- costo por lead
  updated_at     timestamptz not null default now()
);

comment on table public.anuncios is 'Anuncios activos sincronizados de la Marketing API de Meta. Join: leads.ad_id o leads.campana.';

-- ── Índices para las consultas del dashboard ──────────────────────────────────
create index if not exists idx_leads_campana  on public.leads (campana);
create index if not exists idx_leads_etapa    on public.leads (etapa);
create index if not exists idx_leads_ad_id    on public.leads (ad_id);
create index if not exists idx_leads_fecha    on public.leads (fecha);
create index if not exists idx_mensajes_lead  on public.mensajes (lead_id);
create index if not exists idx_anuncios_camp  on public.anuncios (campana);

-- ── updated_at automático en leads (se refresca en cada UPDATE) ────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ── Seguridad (RLS) ───────────────────────────────────────────────────────────
-- El dashboard lee vía función serverless con la service_role key (que IGNORA RLS),
-- así que con RLS activado y SIN políticas públicas queda seguro por default:
-- nadie con la anon key puede leer/escribir desde el navegador.
alter table public.leads    enable row level security;
alter table public.mensajes enable row level security;
alter table public.anuncios enable row level security;

-- (Opcional) Si algún día el dashboard leyera DIRECTO desde el navegador con la
-- anon key, descomentar para permitir SOLO lectura pública. Con el proxy actual
-- NO hace falta — mejor dejarlo cerrado.
-- create policy "lectura publica leads"    on public.leads    for select using (true);
-- create policy "lectura publica anuncios" on public.anuncios for select using (true);
