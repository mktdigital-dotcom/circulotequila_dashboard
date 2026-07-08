# Insertar/actualizar en NocoDB desde n8n · HTTP Request node

> Reemplaza los nodos "Crear Lead" / "Actualizar Lead" (que fallan en el create)
> por **HTTP Request** contra la **REST API v2 de NocoDB** — la misma ruta que el
> dashboard usa en producción y que sí funciona. Copia-pega y ajusta.

---

## Datos base (para todas las llamadas)

- **Host:** `https://n8n-nocodb.pzqn6b.easypanel.host`
- **Auth:** header `xc-token: <TOKEN nc_pat_...>` (el mismo que ya usan)
- **Content-Type:** `application/json`

### IDs de tabla
| Tabla | tableId |
|---|---|
| Leads | `m29hmkkqhrq8wev` |
| Mensajes / Signals | `mm1dc5yyzuspkiw` |
| Señales (alt) | `mqbezsfl3302vl5` |

> Config del nodo HTTP Request en n8n: **Authentication = None**, activar **Send
> Headers** (agregar `xc-token` y `Content-Type`) y **Send Body = JSON**.

---

## 1. CREAR un registro  (POST)

```
POST  https://n8n-nocodb.pzqn6b.easypanel.host/api/v2/tables/m29hmkkqhrq8wev/records
```
Body (JSON) — los keys deben ser el **título exacto** de la columna (con acento):
```json
{
  "lead_id":  "={{ $json.lead_id }}",
  "fecha":    "={{ $now.toFormat('yyyy-LL-dd HH:mm') }}",
  "canal":    "whatsapp",
  "linea":    "={{ $('Detección de Canal').item.json.deteccion.lineaParaLead }}",
  "nombre":   "={{ $json.nombre }}",
  "contacto": "={{ $json.whatsappPhone }}",
  "ciudad":   "={{ $('Detección de Canal').item.json.deteccion.ciudadParaLead }}",
  "campaña":  "={{ $('Detección de Canal').item.json.deteccion.campana }}",
  "anuncio":  "={{ $('Detección de Canal').item.json.deteccion.anuncio }}",
  "etapa":    "nuevo",
  "owner":    "agente"
}
```
Respuesta: el registro creado, incluye su **`Id`** interno (útil para el update).

> Se pueden crear varios de golpe mandando un **arreglo** de objetos en el body.

---

## 2. ACTUALIZAR un registro  (PATCH)

NocoDB v2 actualiza **por su `Id` interno**, no por `lead_id`. Como el flujo trae el
`lead_id` (no el `Id`), el patrón es **buscar → actualizar**:

### 2a. Buscar el Id por lead_id (GET)
```
GET  https://n8n-nocodb.pzqn6b.easypanel.host/api/v2/tables/m29hmkkqhrq8wev/records?where=(lead_id,eq,{{ $json.lead_id }})&limit=1
```
Devuelve `list[0].Id`.

### 2b. Actualizar con ese Id (PATCH)
```
PATCH  https://n8n-nocodb.pzqn6b.easypanel.host/api/v2/tables/m29hmkkqhrq8wev/records
```
Body (JSON) — incluir `Id` + los campos a escribir:
```json
{
  "Id":          "={{ $json.Id }}",
  "score":       "={{ $('Motor de Score').item.json.score }}",
  "tier":        "={{ $('Motor de Score').item.json.tier }}",
  "botellas":    "={{ $('Motor de Score').item.json.bottles ?? '' }}",
  "ciudad":      "={{ $('Detección de Canal').item.json.deteccion.ciudadParaLead }}",
  "campaña":     "={{ $('Detección de Canal').item.json.deteccion.campana }}",
  "anuncio":     "={{ $('Detección de Canal').item.json.deteccion.anuncio }}",
  "etapa":       "={{ $('Motor de Score').item.json.gate ? 'perdido' : ($('Motor de Score').item.json.tier === 'A' ? 'interesado' : ($('Motor de Score').item.json.tier === 'B' ? 'calificado' : 'en_conversacion')) }}",
  "contexto":    "={{ ($('Detección de Canal').item.json.deteccion.ciudad || 'ciudad s/confirmar') + ' · tier ' + $('Motor de Score').item.json.tier + ' (' + $('Motor de Score').item.json.score + ')' }}"
}
```

---

## 3. Patrón "crear o actualizar" (upsert manual)

NocoDB v2 no tiene upsert nativo. El flujo ya tiene la estructura correcta: primero
**buscar** el lead por `lead_id` (paso 2a) y con un **IF**:
- **existe** (`list` no vacío) → PATCH (paso 2b)
- **no existe** → POST (paso 1)

Es exactamente lo que hacían "Crear Lead" / "Actualizar Lead"; solo cambian los dos
nodos NocoDB por HTTP Request.

---

## 4. Guardar un mensaje en la bitácora  (POST a Mensajes)

```
POST  https://n8n-nocodb.pzqn6b.easypanel.host/api/v2/tables/mm1dc5yyzuspkiw/records
```
```json
{
  "lead_id":  "={{ $('Armar Mensaje').item.json.lead_id }}",
  "ts":       "={{ $now.toFormat('yyyy-LL-dd HH:mm') }}",
  "canal":    "whatsapp",
  "emisor":   "agente",
  "etiqueta": "respuesta_agente",
  "texto":    "={{ $json.respuesta.map(p => p.parte).join('\\n') }}"
}
```

---

## Por qué esto sí funciona (y el nodo no)

El nodo "Create" de NocoDB se rompe al mapear columnas con **ñ/acentos**
(`campaña`, `propósito`) o con valores de SingleSelect fuera de las opciones. El
HTTP Request manda el JSON **directo a la API**, sin el mapeo mágico intermedio, y
la API acepta los nombres con acento tal cual. Es la misma ruta probada del
dashboard.

> Si más adelante migran a Supabase (ver sql/supabase_schema.sql), el mismo patrón
> aplica contra su API (`POST {SUPABASE_URL}/rest/v1/leads` con
> `Prefer: resolution=merge-duplicates` para upsert nativo por lead_id).
