# Mapa de datos · NocoDB → Dashboard

Estrategia de mapeo de la base **Proceso Comercial - Círculo Tequila** (`pw5fbulfxbvr6ko`)
hacia el dashboard, alineada a la **Arquitectura comercial validada con Kenia** (v.2026.06b)
y a las 5 secciones solicitadas. Fuente de verdad: NocoDB (lo escribe el agente + el sistema).

Host NocoDB: `n8n-nocodb.slmipf.easypanel.host` · lectura vía `/api/nocodb` (serverless, token server-side).

---

## Tablas

| Recurso | Tabla NocoDB | ID | Rol |
|---------|--------------|-----|-----|
| `leads` | Leads | `m2iuluccpx3i11o` | Fila = un lead avanzando por las 10 etapas |
| `signals` | Signal_log | `mebd3yz1aj8e291` | Bitácora append-only (§13): el agente escribe, el scoring lee |
| `catalogo` | catalogo | `mrbt25f6tfuafmv` | Precios por línea (§01.1) |
| `plantilla` | Plantilla | `mf9unimceympa4b` | Plantillas de mensajes (M1–M5, SEG) |
| `rubrica` | rúbrica | `mw8ifbh4qmln0gd` | Rúbrica de scoring (versión) |
| `documentacion` | documentación | `m5jrvujitikscef` | Notas del modelo |
| `descripcionUso` | Descripción de Uso | `mrdekwjfxu5e2y9` | Guía de uso |

> Base secundaria **Circulo Tequila Data Negocio** (`ppfl1c7wnts3gja`): config de negocio
> (líneas y precios, segmentos, reglas, alcance del agente, escalamiento, etapas del pipeline).

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

### `etapa` → etapa del pipeline (1–10)
`nuevo`=1 · `en_conversacion`=2 · `calificado`=3 · `interesado`=4 · `transferido`=5 ·
`propuesta`=6 · `anticipo`=7 · `brief`=8 · `diseno`=9 · `produccion`=10 · **`perdido`=reactivación**.
El agente trabaja 1–4; de 5 en adelante solo se registra (§06).

### `estatus_mkt` → próximo toque (§13)
Se traduce cada estatus de Kenia a una acción sugerida (ver `ESTATUS_NEXT` en `src/data/live.js`):
"En espera para enviar costos", "Se enviaron costos", "Sin respuesta después de enviar costos",
"Pendiente confirmar llamada", "Lead enviado", "Se envió link de tienda", "No está interesado".

## Campos de `Signal_log` → dashboard
`lead_id`, `ts`, `tipo` (toque/respuesta/señal), `plantilla_id` (M1–M5/SEG), `canal`, `valor/detalle`, `actor`.
→ **Línea de tiempo real por lead** (drawer de Leads) + última interacción y días sin movimiento (Sección 2).

---

## Las 5 secciones (alineadas a “[11] Dashboard” y las 3 preguntas del lunes)

1. **Resumen del embudo** — leads generados / en conversación / calificados / enviados a ventas /
   reactivación. Fuente: `etapa` + `tier` + `score`. → Panel (tira "En vivo" + embudo).
   Estado: **KPIs en vivo ✅** · embudo por etapa real (en progreso).
2. **Seguimiento y estado** — responsable, última interacción, días sin movimiento, próximo toque.
   Fuente: `estatus_mkt` + Signal_log. → Sección Seguimientos. Estado: **✅ conectado**.
3. **Rendimiento por canal** — Meta/web/referidos/eventos: cantidad, calidad (tier), conversión.
   Fuente: `canal` + `campaña` + `tier`. → Panel · "Qué canales generan clientes". Estado: **pendiente**.
4. **Conversión comercial** — transferidos (etapa ≥5), estatus, motivos de pérdida, tiempos.
   Fuente: `etapa` + `estatus_mkt` + `requalify_at`. → Panel · handoff. Estado: **pendiente**.
5. **Tendencias y análisis** — semanal/mensual, cuellos de botella por etapa.
   Fuente: `fecha` + `etapa` en el tiempo. → Panel · tendencias. Estado: **pendiente**.

## Reglas de la arquitectura reflejadas
- Solo filas con `lead_id = L-####` cuentan como lead (se filtran vacías y notas).
- `perdido` + `requalify_at` → cola de reactivación (no se pierde el lead).
- Ciudad define vendedor (GDL/CDMX/Riviera Maya) al llegar a etapa 5 (§04.2, §07).
- Valor = estimación (`botellas × $2,250`), nunca un precio confirmado (guardrail §10).
