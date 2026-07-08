# Cambios requeridos en el flujo n8n "Círculo WEB"

Objetivo (regla de oro): **la tabla `Leads` es la base maestra** — cada conversación
debe dejar al lead SIEMPRE completo y actualizado. `Mensajes` es solo la bitácora;
`contexto` es el resumen que viaja a ventas. Hoy el flujo NO escribe varios campos
que ya calcula. Estos son los cambios, con las expresiones exactas.

> Los datos ya existen en el flujo (nodos "Detección de Canal" y "Motor de Score").
> Solo hay que mapearlos a NocoDB. Nada de esto cambia la conversación del agente.

---

## Cambio 0 · Nodo **"Telefonos de prueba"** (IF) — permitir sesiones nuevas
Hoy el gate solo deja pasar 3 números fijos. El simulador ahora puede crear
"sesiones nuevas" con teléfonos sintéticos que empiezan con **`+521555`**. Para
que esas pruebas también reciban respuesta del agente, agregar una condición
(combinator **OR**):

- `{{ $json.whatsappPhone }}` **starts with** `+521555`

Así cualquier prueba del simulador (las 3 fijas + las nuevas) recibe respuesta,
y los números reales de clientes siguen fuera del modo prueba.

---

## Cambio 0.5 · Nodo **"Detección de Canal"** — atribución por FRASE DE APERTURA
El anuncio es casi idéntico en todas las campañas; **solo cambia la frase inicial**,
y esa frase identifica campaña + ciudad + línea. Es la fuente de atribución **base**
(siempre disponible, aun sin CTWA). Reglas (normalizar: minúsculas, sin acentos,
trim). Evaluar en ESTE orden para evitar colisiones:

| Frase de apertura (normalizada) | campaña | ciudad | línea |
|---|---|---|---|
| contiene `informacion sobre edicion empresarial` | `web_popup_empresarial` | otro | empresarial |
| contiene `informacion sobre circulo tequila` | `web_general` | otro | — |
| empieza con `me encantaria recibir informacion` | `campana_slp` | SLP | empresarial |
| empieza con `podrian darme informacion` | `campana_rm` | Riviera Maya | empresarial |
| empieza con `me gustaria` + contiene `informacion` | `campana_cdmx` | CDMX | empresarial |
| empieza con `quiero informacion` | `campana_gdl` | GDL | empresarial |

> El orden importa: las dos de **web** se detectan por palabra clave (`edicion
> empresarial` / `circulo tequila`) ANTES que las 4 de Meta, que se detectan por el
> verbo inicial. Escribir también `fuente_señal = 'frase_apertura'`.
> **Prioridad de verdad:** si existe `ctwa_clid`/referral de Meta (Cambio CTWA), ese
> gana sobre la frase; la frase es el respaldo. El dashboard ya aplica esta misma
> lógica como fallback cuando `campaña` viene vacío (marca "por frase").

## Cambio CTWA (recomendado) · atribución exacta por `ctwa_clid`
La frase se pierde si la clienta borra el texto pre-llenado. La forma **durable** es
Click-to-WhatsApp nativo: cada clic genera un `ctwa_clid` que ManyChat captura y de
ahí se deriva `ad_id → campaña + anuncio + métricas`. Ver SOP CTWA. Cuando esté
montado (GATE 3 del SOP = la cuenta de anuncios aparece en el trigger):

1. ManyChat: trigger "clic en anuncio CTWA" → Set Custom Field `ctwa_clid` + `ad_id`.
2. El webhook a n8n incluye `referral` (adId / ctwaClid / headline).
3. En "Detección de Canal": si hay `referral`, `fuente_señal = 'referral_meta'` y
   `anuncio = headline || adId` (gana sobre la frase).
4. Guardar `ctwa_clid` y `anuncio_id` en el lead → enlaza con la Marketing API.

---

## Cambio 1 · Nodo **"Crear Lead"** (NocoDB create → tabla Leads)
Agregar al mapeo de campos (junto a los existentes):

| Campo | Valor (expresión) |
|---|---|
| `campaña` | `{{ $('Detección de Canal').item.json.deteccion.campana }}` |
| `anuncio` | `{{ $('Detección de Canal').item.json.deteccion.anuncio }}` |
| `owner` | `agente` |

## Cambio 2 · Nodo **"Actualizar Lead"** (NocoDB update → tabla Leads)
Hoy solo escribe `score` y `tier`. Agregar:

| Campo | Valor (expresión) |
|---|---|
| `botellas` | `{{ $('Motor de Score').item.json.bottles ?? '' }}` |
| `campaña` | `{{ $('Detección de Canal').item.json.deteccion.campana }}` |
| `anuncio` | `{{ $('Detección de Canal').item.json.deteccion.anuncio }}` |
| `ciudad` | `{{ $('Detección de Canal').item.json.deteccion.ciudadParaLead }}` |
| `etapa` | `{{ $('Motor de Score').item.json.gate ? 'perdido' : ( /(agend|llamad|llamar|reunion|cita|asesor|vendedor|siguiente paso|avanzar|me interesa|acepto|adelante|de acuerdo|procede|contact)/i.test($('Combine content and set properties').item.json.CombinedMessage || '') ? 'interesado' : ($('Motor de Score').item.json.tier === 'A' ? 'interesado' : ($('Motor de Score').item.json.tier === 'B' ? 'calificado' : 'en_conversacion'))) }}` |
| `contexto` | `{{ ($('Detección de Canal').item.json.deteccion.ciudad || 'ciudad s/confirmar') + ($('Motor de Score').item.json.bottles ? ' · ' + $('Motor de Score').item.json.bottles + ' bot' : '') + ' · tier ' + $('Motor de Score').item.json.tier + ' (' + $('Motor de Score').item.json.score + ')' + ' · último: ' + ($('Combine content and set properties').item.json.CombinedMessage || '').slice(0, 140) }}` |
| `requalify_at` | `{{ $('Motor de Score').item.json.gate ? $now.plus({ days: 90 }).toFormat('yyyy-LL-dd') : '' }}` |

> `contexto` v1 es un resumen determinista (ciudad · botellas · tier/score · último
> mensaje). Si luego se quiere un resumen redactado por el LLM, se agrega un nodo
> LLM barato entre "Motor de Score" y "Actualizar Lead" — pero esto ya cumple.

> **`etapa` = "interesado" por HITO CONDUCTUAL, no solo por tier.** Cuando el cliente
> acepta explícitamente avanzar (agendar llamada, pasar con asesor, "acepto",
> "adelante"…), la etapa sube a `interesado` aunque el score aún no sea tier A. Esto
> arregla el caso "acepté el siguiente paso pero seguía en conversación". El
> dashboard/simulador ya aplica la misma regla.

## Cambio 3 · NUEVO nodo **"Log Respuesta"** (NocoDB create → tabla Mensajes)
Hoy solo se guarda el mensaje del cliente ("Log Mensaje"). Falta guardar lo que
responde el agente, para que el historial de la conversación quede completo.

- Tipo: NocoDB → row → create · tabla **Mensajes** (la misma de "Log Mensaje")
- Conectarlo como **segunda salida de "Construir Respuesta"** (en paralelo a
  "Respond to Webhook" — no lo retrasa)
- Campos:

| Campo | Valor |
|---|---|
| `lead_id` | `{{ $('Armar Mensaje').item.json.lead_id }}` |
| `ts` | `{{ $now.toFormat('yyyy-LL-dd HH:mm') }}` |
| `canal` | `whatsapp` |
| `emisor` | `agente` |
| `etiqueta` | `respuesta_agente` |
| `texto` | `{{ $json.respuesta.map(p => p.parte).join('\n') }}` |

## Cambio 4 (opcional) · `estatus_mkt` automático
En "Actualizar Lead", con el vocabulario de Kenia:

```
{{ $('Motor de Score').item.json.gate === 'no_interesa' ? 'No está interesado'
   : /agendar|llamada|llamar/i.test($('Combine content and set properties').item.json.CombinedMessage) ? 'Pendiente confirmar llamada'
   : /precio|costo|cuanto|cotiza/i.test($('Combine content and set properties').item.json.CombinedMessage) ? 'Se enviaron costos'
   : 'En espera para enviar costos' }}
```

---

## Resultado esperado
Tras cada mensaje de prueba de Kenia, la fila del lead en `Leads` queda completa:
fecha, canal, línea, **campaña, anuncio**, nombre, contacto, ciudad, **botellas**,
propósito*, **estatus, etapa, tier, score**, tipo_lead y **contexto** (el resumen
que ventas ve en el Pipeline). Y en `Mensajes` queda **toda la conversación**
(cliente + agente).

\* `propósito` se llenará mejor cuando el agente lo capture explícito; el score ya
detecta la ocasión como señal.

> Nota: el dashboard ya lee todos estos campos — en cuanto el flujo los escriba,
> aparecen solos en el Pipeline y el Resumen (polling).
