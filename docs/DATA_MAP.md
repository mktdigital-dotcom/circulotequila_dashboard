# Mapa de datos · NocoDB → Dashboard

## ⭐ Regla de oro del modelo de datos (definida por Libia)

**La tabla `Leads` es LA base — reemplaza los Sheets de Kenia.** Una fila por lead,
SIEMPRE creada y actualizada por el agente/sistema en cada conversación, con TODOS
estos campos: `fecha, canal, linea, campaña, anuncio, nombre, contacto, ciudad,
ciudad_validada, botellas, propósito, estatus_mkt, etapa, tier, score, tipo_lead,
contexto`.

- **`Mensajes`** = solo la bitácora (cada mensaje enviado/recibido, por lead_id).
- **`contexto`** (columna de Leads) = el RESUMEN de lo que pasó en los mensajes —
  es lo que viaja a ventas y se muestra en el Pipeline. Debe actualizarse por
  automatización tras cada interacción, no a mano.

### ⚠️ Brecha detectada en el flujo n8n "Círculo WEB" (para el equipo dev)
Hoy el nodo **Crear Lead** solo escribe: `lead_id, fecha, canal, linea, nombre,
contacto, ciudad, etapa, tipo_lead` — y **Actualizar Lead** solo `score, tier`.
**Faltan por escribir:** `campaña, anuncio, botellas, propósito, estatus_mkt,
contexto, ciudad_validada, requalify_at`. La detección ya calcula campaña/anuncio/
ciudad_validada (nodo Detección de Canal) y el score ya extrae botellas — solo hay
que mapearlos al Actualizar Lead, y agregar un paso que genere el `contexto`
(resumen breve) tras cada respuesta del agente.


Estrategia de mapeo de la base **Circulo Tequila Proceso Comercial** (`ppqrrdcbc6zxi9h`)
hacia el dashboard, alineada a la **Arquitectura comercial validada con Kenia** (v.2026.06b)
y a las 5 secciones solicitadas. Fuente de verdad: NocoDB (lo escribe el agente + el sistema).

Host NocoDB: `n8n-nocodb.pzqn6b.easypanel.host` · lectura vía `/api/nocodb` (serverless, token server-side).
Se puede sobreescribir con `NOCODB_HOST` / `NOCODB_BASE` en Vercel.

> **Estos son los valores reales, verificados contra `api/nocodb.js`.** Hasta la
> auditoría del 2026-07-20 este documento apuntaba a otra instancia (`slmipf`),
> otra base (`pw5fbulfxbvr6ko`) y otros table IDs — ninguno existía ya. Si vuelve
> a haber discrepancia, gana `api/nocodb.js`: es lo que corre.

---

## Tablas

Las que el dashboard realmente consulta (constante `TABLES` en `api/nocodb.js`):

| Recurso | Tabla NocoDB | ID | Rol |
|---------|--------------|-----|-----|
| `leads` | Leads | `m29hmkkqhrq8wev` | Fila = un lead avanzando por las 10 etapas |
| `signals` | Mensajes | `mm1dc5yyzuspkiw` | Bitácora de mensajes por `lead_id` (línea de tiempo) |
| `senales` | Señales | `mqbezsfl3302vl5` | Señales de scoring (§13) |
| `notas` | Notas | *(se resuelve por nombre)* | Notas compartidas Libia/Kenia. Columnas: `lead_id, autor, texto, ts` |

`notas` no tiene ID fijo: `getNotasTableId()` la busca por nombre en la base y
cachea el resultado. Se puede fijar con `NOCODB_NOTAS_TABLE`.

> Las tablas de configuración (`catalogo`, `Plantilla`, `rúbrica`,
> `documentación`, `Descripción de Uso`) y la base **Data Negocio** existen en
> NocoDB pero **el dashboard no las lee hoy**: no están en `TABLES` y no hay
> endpoint que las exponga. Antes este doc las listaba con IDs como si
> estuvieran conectadas. Si se conectan, se agregan a `TABLES` y se documentan
> aquí con el ID real.

## Campos de `Leads` → dashboard

| Campo NocoDB | Significado | Dónde se usa en el dashboard |
|--------------|-------------|------------------------------|
| `lead_id` | ID (L-####) | Filtro de fila real; identificador en todas las vistas |
| `nombre` | Nombre/empresa | Nombre de la tarjeta / fila |
| `canal` | whatsapp, web… | Sección 3 · Rendimiento por canal |
| `linea` | empresarial, turismo, amazon, retail | Tag; segmentación por línea (§01) |
| `campaña` / `anuncio` | Campaña Meta y creativo | Sección 3 · canal/campaña (§04) |
| `ciudad` | GDL, CDMX, Riviera Maya, SLP… | Asignación de vendedor (§04.2); KPIs por ciudad |
| `botellas` | Volumen | Valor estimado (× $2,250) y calificación |
| `propósito` | evento, amenidad, regalo… | Ocasión de la tarjeta |
| `etapa` | nuevo→producción + `perdido` | **Embudo (Sección 1)** y posición en el pipeline |
| `tier` | A/B/C/D | KPIs de calidad; prioridad de handoff |
| `score` | 0–100 | Score promedio; orden de prioridad |
| `estatus_mkt` | vocabulario de Kenia (§13) | **Seguimiento (Sección 2)** → próximo toque |
| `owner` | agente / vendedor | Responsable actual |
| `requalify_at` | fecha de reactivación | Cola de reactivación (Sección 2) |
| `contexto` | resumen libre | Detalle del lead (drawer) |
| `fecha` | fecha de entrada | Tendencias (Sección 5); antigüedad |
| `handoff_at` | cuándo pasó al vendedor | **Velocidad del handoff** (Panel · handoff) |
| `perdido_at` | cuándo se marcó perdido | Marca de pérdida; separa lead malo de handoff malo |
| `motivo_perdida` | slug del motivo | Motivos de pérdida (Panel · handoff) |

### Campos de pérdida y handoff (resultado #8)
- `motivo_perdida` es **selección única** con estos slugs exactos:
  `precio`, `timing`, `competencia`, `sin_respuesta_vendedor`, `dato_incompleto`, `otro`.
  Vacío = **pendiente de clasificar**, y así se muestra. Ni el dashboard ni el
  clasificador automático rellenan `otro` por defecto: sin evidencia, no hay motivo.
- Marcar un lead como perdido **NO** sobreescribe `etapa` — se escribe
  `perdido_at` y se conserva el paso real en el que iba. Es lo que permite
  distinguir "lead malo" (se cayó en etapa 1–4) de "handoff malo" (etapa 5+).
- `handoff_at` se lee desde `src/data/live.js` (`horasDesdeHandoff`). Los leads en
  etapa ≥5 **sin** `handoff_at` se cuentan aparte como `sinDato`: es brecha de
  instrumentación, no cero.

> ⚠️ **Falta para cerrar el KPI de handoff:** NocoDB no guarda la fecha de cada
> cambio de etapa ni la de cierre, solo `handoff_at` y `perdido_at`. Por eso hoy
> se mide *"horas transcurridas desde el handoff"*, no *"handoff → primer
> avance"*. Para el KPI completo, n8n debe escribir un `etapa_actualizada_at` (o
> una bitácora de cambios de etapa) en `Leads`; el cálculo ya está listo en
> `panelModel` para engancharse ahí.

### `etapa` → etapa del pipeline (1–10)
`nuevo`=1 · `en_conversacion`=2 · `calificado`=3 · `interesado`=4 · `transferido`=5 ·
`propuesta`=6 · `anticipo`=7 · `brief`=8 · `diseno`=9 · `produccion`=10 · **`perdido`=reactivación**.
El agente trabaja 1–4; de 5 en adelante solo se registra (§06).

### `estatus_mkt` → próximo toque (§13)
Se traduce cada estatus de Kenia a una acción sugerida (ver `ESTATUS_NEXT` en `src/data/live.js`):
"En espera para enviar costos", "Se enviaron costos", "Sin respuesta después de enviar costos",
"Pendiente confirmar llamada", "Lead enviado", "Se envió link de tienda", "No está interesado".

## Campos de `Mensajes` (recurso `signals`) → dashboard
`lead_id`, `ts`, `tipo` (toque/respuesta/señal), `plantilla_id` (M1–M5/SEG), `canal`, `valor/detalle`, `actor`.
El lector tolera además el esquema alterno `texto` / `emisor` / `etiqueta`.
→ **Línea de tiempo real por lead** (drawer de Leads) + última interacción y días sin movimiento (Sección 2).

---

## Las 5 secciones (alineadas a “[11] Dashboard” y las 3 preguntas del lunes)

1. **Resumen del embudo** — leads generados / en conversación / calificados / enviados a ventas /
   reactivación. Fuente: `etapa` + `tier` + `score`. → Panel (tira "En vivo" + embudo real). **✅**
2. **Seguimiento y estado** — responsable, última interacción, días sin movimiento, próximo toque.
   Fuente: `estatus_mkt` + Signal_log. → Sección Seguimientos. **✅**
3. **Rendimiento por canal** — Meta/web/referidos/eventos: cantidad, calidad (tier), conversión.
   Fuente: `canal` + `campaña` + `tier`. → Panel · "Qué canales generan clientes". **✅**
4. **Conversión comercial** — transferidos (etapa ≥5), estatus, motivos de pérdida, tiempos.
   Fuente: `etapa` + `estatus_mkt` + `requalify_at`. → Panel · handoff. **✅**
5. **Tendencias y análisis** — leads por semana según `fecha`; cuellos de botella por etapa.
   Fuente: `fecha` + `etapa`. → Panel · tendencias. **✅ (base; se enriquece con más historial)**

> Pendiente de afinar cuando haya más datos: deltas de tendencias (comparativos), `catalogo`
> (precios por línea desde la base) y detalle de `contexto` en el drawer de Leads.

## Reglas de la arquitectura reflejadas
- Cuentan como lead las filas con `lead_id = L-####` **o** `mc_<telefono>`
  (sesiones del webhook/simulador). Se filtran vacías, encabezados y notas.
- Los **leads de prueba** (teléfonos sintéticos `+521555…` y los 3 fijos de
  pruebas) se excluyen de TODOS los KPIs — embudo, orígenes, handoff, tendencias.
  Siguen visibles en el Pipeline con el chip 🧪 y se reportan aparte como
  "N de prueba excluidos". Ver `sinPruebas()` en `src/data/live.js`.
- `perdido` + `requalify_at` → cola de reactivación (no se pierde el lead).
- Ciudad define vendedor (GDL/CDMX/Riviera Maya) al llegar a etapa 5 (§04.2, §07).
- Valor = estimación (`botellas × $2,250`), nunca un precio confirmado (guardrail §10).
