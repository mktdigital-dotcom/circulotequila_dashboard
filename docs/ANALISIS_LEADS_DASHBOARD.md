# Análisis · tabla `Leads` (NocoDB) → Dashboard

> Auditoría campo por campo: qué columna de la tabla `Leads` se muestra en el
> dashboard y dónde. Comparado contra el **esquema real** de la tabla (capturado
> de una ejecución real del flujo n8n) y contra el código (`src/data/live.js`).
> Los desajustes marcados 🔴 ya fueron corregidos y desplegados.

## ✅ Campos que SÍ se muestran (17 de 18)

| Columna NocoDB | Dónde se ve en el dashboard |
|---|---|
| `lead_id` | ID de la tarjeta en el Pipeline |
| `nombre` | Nombre de la tarjeta (+ 🧪 si es prueba) |
| `fecha` | Drawer ("Fecha de entrada") + Tendencias por semana |
| `canal` | Drawer |
| `linea` | Drawer + etiqueta de la tarjeta |
| `campaña` | Drawer ("Origen/campaña") + tarjeta "De dónde vienen los leads" |
| `anuncio` | Drawer |
| `contacto` | Drawer + de ahí se deduce el **país** |
| `ciudad` | Drawer + "ciudades top" del Resumen |
| `ciudad_validada` | Drawer (chip "✓ validada") + define el vendedor asignado |
| `botellas` | Drawer ("Volumen") + valor estimado (× $2,250) |
| `proposito` | Drawer ("Propósito") |
| `etapa` | Columna del Pipeline + Embudo del Resumen |
| `tier` / `score` | Drawer + KPIs (calientes, score promedio, por tier) |
| `estatus` | Drawer ("Estatus MKT") + próximo toque + motivos de pérdida |
| `tipo_lead` | Drawer ("Tipo de lead") |
| `requalify_at` | Drawer ("Reactivar el") + cola de reactivación |

## 🔴 Desajustes corregidos (ya desplegados)

1. **`estatus`** — el dashboard leía `estatus_mkt` (columna inexistente). El estatus
   comercial de Kenia nunca se mostraba, y con él se caían "próximo toque" y
   "motivos de pérdida". Ahora lee `estatus` (y tolera `estatus_mkt`).
2. **`ciudad_validada`** — existía y se ignoraba. Ahora se muestra y define el
   vendedor asignado (§04.2).
3. **`tipo_lead`** — existía y se ignoraba. Ahora tiene su campo en el drawer.
4. **`owner`** — no existe en la tabla; el "Responsable" salía "—". Ahora se deriva
   por etapa: 1–4 → Agente IA, 5+ → vendedor por ciudad.

## 🟡 Pendiente (no depende del dashboard)

- **`contexto`** — el dashboard ya lo lee, pero **la columna no existe en la tabla**.
  Es el resumen que viaja a ventas (regla de oro del modelo). **Acción:** crear la
  columna `contexto` en NocoDB + que n8n la escriba (ver `docs/CAMBIOS_N8N.md`,
  Cambio 2).
- **`campaña`/`anuncio`** — se muestran, pero solo se llenan si n8n los escribe o
  por el fallback de frase de apertura del dashboard.
- **`CreatedAt`/`UpdatedAt`** — automáticas de NocoDB; no se usan (la última
  interacción sale de `Mensajes`, más preciso). Sin acción.

## Conclusión
Cobertura **17/18** columnas. El único faltante real es `contexto`, que falta en la
propia tabla. El punto ciego que quedaba —el estatus comercial de Kenia (§13)— ya
está conectado.
