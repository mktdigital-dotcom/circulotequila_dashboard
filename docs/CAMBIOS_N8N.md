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
| `etapa` | `{{ $('Motor de Score').item.json.gate ? 'perdido' : ($('Motor de Score').item.json.tier === 'A' ? 'interesado' : ($('Motor de Score').item.json.tier === 'B' ? 'calificado' : 'en_conversacion')) }}` |
| `contexto` | `{{ ($('Detección de Canal').item.json.deteccion.ciudad || 'ciudad s/confirmar') + ($('Motor de Score').item.json.bottles ? ' · ' + $('Motor de Score').item.json.bottles + ' bot' : '') + ' · tier ' + $('Motor de Score').item.json.tier + ' (' + $('Motor de Score').item.json.score + ')' + ' · último: ' + ($('Combine content and set properties').item.json.CombinedMessage || '').slice(0, 140) }}` |
| `requalify_at` | `{{ $('Motor de Score').item.json.gate ? $now.plus({ days: 90 }).toFormat('yyyy-LL-dd') : '' }}` |

> `contexto` v1 es un resumen determinista (ciudad · botellas · tier/score · último
> mensaje). Si luego se quiere un resumen redactado por el LLM, se agrega un nodo
> LLM barato entre "Motor de Score" y "Actualizar Lead" — pero esto ya cumple.

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
