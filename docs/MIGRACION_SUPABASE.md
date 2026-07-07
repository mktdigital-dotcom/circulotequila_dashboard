# Plan de migración · NocoDB → Supabase

> Objetivo: mover la base a **Supabase (Postgres puro)** para mayor estabilidad y
> escrituras confiables desde n8n y desde el código, sin perder nada. La vista
> "simple" que Kenia tenía en NocoDB la reemplaza el **dashboard** (y, si hace
> falta editar a mano, una vista de tabla editable dentro del propio dashboard).
>
> **Sin salto al vacío:** NocoDB sigue vivo hasta que Supabase esté probado en
> paralelo. Con solo 3 leads, el corte es indoloro — por eso conviene hacerlo ahora.

---

## 1. Por qué Supabase

- Es **Postgres de verdad**: escrituras confiables desde n8n (Postgres o su API),
  desde el código y desde donde sea. Sin la capa de NocoDB que pelea los inserts.
- Ideal para lo **analítico** que estamos construyendo (leads × anuncios × gasto).
- **Columnas limpias en snake_case, sin ñ ni acentos** → se acaba de raíz el bug de
  "create" que rompía con `campaña` / `propósito`.
- Ya lo usan para secretos; una sola plataforma menos que mantener.

---

## 2. Esquema equivalente (lo que hay que crear en Supabase)

Mismos datos que NocoDB, con nombres limpios. Tres tablas:

### `leads` (la base maestra — reemplaza los Sheets de Kenia)
| Columna | Tipo | Venía de NocoDB |
|---|---|---|
| `id` | bigint identity PK | (interno) |
| `lead_id` | text unique | `lead_id` |
| `nombre` | text | `nombre` |
| `canal` | text | `canal` |
| `linea` | text | `linea` |
| `campana` | text | `campaña` |
| `anuncio` | text | `anuncio` |
| `ad_id` | text | (nuevo · CTWA / Marketing API) |
| `ciudad` | text | `ciudad` |
| `ciudad_validada` | text | `ciudad_validada` |
| `botellas` | int | `botellas` |
| `proposito` | text | `propósito` |
| `estatus_mkt` | text | `estatus_mkt` |
| `etapa` | text | `etapa` |
| `tier` | text | `tier` |
| `score` | int | `score` |
| `tipo_lead` | text | `tipo_lead` |
| `contexto` | text | `contexto` |
| `owner` | text | `owner` |
| `requalify_at` | date | `requalify_at` |
| `fuente_atribucion` | text | (nuevo · `ctwa` / `frase` / `ninguna`) |
| `fecha` | timestamptz default now() | `fecha` |
| `updated_at` | timestamptz default now() | (interno) |

### `mensajes` (bitácora — cada mensaje enviado/recibido)
| Columna | Tipo | Venía de |
|---|---|---|
| `id` | bigint identity PK | (interno) |
| `lead_id` | text (FK → leads.lead_id) | `lead_id` |
| `ts` | timestamptz default now() | `ts` |
| `canal` | text | `canal` |
| `emisor` | text (`cliente` / `agente`) | `emisor` |
| `etiqueta` | text | `etiqueta` / `tipo` |
| `texto` | text | `texto` / `valor/detalle` |

### `anuncios` (caché de la Marketing API — anuncios activos)
| Columna | Tipo | Uso |
|---|---|---|
| `id` | bigint identity PK | interno |
| `ad_id` | text unique | id real del anuncio en Meta |
| `nombre` | text | nombre del anuncio |
| `campana` | text | campaña Meta |
| `estado` | text | ACTIVE / PAUSED |
| `texto_creativo` | text | copy del anuncio (para match por frase) |
| `gasto` | numeric | gasto |
| `clics` | int | clics |
| `cpl` | numeric | costo por lead |
| `updated_at` | timestamptz default now() | última sync |

> El join del dashboard: `leads.ad_id = anuncios.ad_id` (exacto, vía CTWA) o
> `leads.campana → anuncios.campana` (heurístico, por frase). Ver ESTRATEGIA_ATRIBUCION_META.md.

---

## 3. Qué cambia en el dashboard (código)

- Nueva función serverless **`/api/supabase`** (mismo patrón que `/api/nocodb`):
  lee las variables de Vercel y consulta la REST API de Supabase (PostgREST).
- **`src/data/live.js`**: prácticamente igual — solo cambian nombres de campo a los
  limpios (`campaña`→`campana`, etc.). El mapeo ya tolera ambos, así que es mínimo.
- El resto del dashboard **no se toca** (mismas vistas, mismos KPIs).

## 4. Qué cambia en n8n (escritura)

- Los nodos "Crear/Actualizar Lead" pasan a escribir a Supabase — por **HTTP Request
  a PostgREST** (upsert) o por el nodo Postgres/Supabase:
  ```
  POST {SUPABASE_URL}/rest/v1/leads
  Headers: apikey: <service_role>,  Prefer: resolution=merge-duplicates
  Body:    { "lead_id": "L-0005", "campana": "campana_gdl", ... }
  ```
  El `Prefer: resolution=merge-duplicates` hace upsert por `lead_id` → una fila
  por lead, siempre completa (la regla de oro).
- Es **más simple** que lo que peleas hoy: columnas limpias, sin el mapeo mágico
  del nodo NocoDB que se rompía con los acentos.

---

## 5. Orden de migración (sin romper nada · corren en paralelo)

1. **Crear** el proyecto Supabase + las 3 tablas (§2).
2. **Importar** los 3 leads actuales (export de NocoDB → insert en Supabase).
3. **Apuntar la LECTURA** del dashboard a Supabase (`/api/supabase`) y verificar que
   se ve idéntico. NocoDB sigue vivo de respaldo.
4. **Repuntar la ESCRITURA** de n8n a Supabase (upsert). Probar con el simulador:
   6 golden runs (una por campaña) que dejen el lead completo.
5. **Verificar paridad** unos días (o unas cuantas pruebas): mismos datos en ambos.
6. **Apagar** NocoDB.

---

## 6. Credenciales · qué crear y DÓNDE ponerlas (⚠️ no en el chat)

Kenia/tú crean el proyecto en [supabase.com](https://supabase.com) y obtienen:

| Credencial | Dónde se consigue | Dónde va |
|---|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | Settings → API | Vercel: `SUPABASE_URL` |
| **`service_role` key** (secreta, god-key) | Settings → API | Vercel: `SUPABASE_SERVICE_ROLE_KEY` · n8n credential |
| **`anon` key** (pública) | Settings → API | Vercel: `SUPABASE_ANON_KEY` (opcional) |
| **DB connection string** | Settings → Database | Solo si n8n usa el nodo Postgres (credential de n8n) |

**Nombres exactos de las variables en Vercel** (así el código las lee):
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY        (opcional)
```

### Reglas de seguridad (importantes)
- La **`service_role` key** es una llave maestra: **solo server-side** (en la función
  `/api/supabase` de Vercel y en n8n). **Nunca** en el navegador, **nunca** en el chat,
  **nunca** en el repo.
- Lo único "compartible" sería el Project URL y la `anon` key; aun así van directo a
  Vercel, no al chat.
- Después de cargar las variables en Vercel → **Redeploy** para que tomen efecto.

---

## 7. Checklist ejecutable

**Kenia / Libia (una vez):**
- [ ] Crear proyecto en Supabase.
- [ ] Crear las 3 tablas (§2) — se puede con un SQL que yo entrego.
- [ ] Cargar `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` en Vercel (§6) y redeploy.
- [ ] Poner la misma `service_role` como credencial en n8n.

**Yo (código):**
- [ ] `/api/supabase` (lectura) + ajustar `live.js` a los campos limpios.
- [ ] SQL de creación de tablas + import de los 3 leads.
- [ ] Repuntar la escritura de n8n a Supabase (si me reconectas el MCP de n8n).
- [ ] Probar los 6 golden runs y verificar paridad antes de apagar NocoDB.

> Mientras tanto: el **create en NocoDB se desbloquea hoy** por su REST API (HTTP
> Request node), para no frenar las pruebas durante la migración.
