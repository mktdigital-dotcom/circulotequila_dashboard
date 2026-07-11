// ─────────────────────────────────────────────────────────────────────────────
// api/agente.js · Proxy seguro del simulador → webhook del agente (n8n).
//
// El simulador ya NO llama al webhook directo desde el navegador. Llama aquí, y
// esta función (del lado del servidor) reenvía al webhook. Beneficios:
//   · La URL del webhook del simulador vive en el servidor (WEBHOOK_SIMULADOR),
//     no en el bundle del navegador.
//   · Queda detrás del candado del dashboard: si DASHBOARD_TOKEN está activo,
//     exige el header x-app-key → solo se dispara con sesión.
//   · Puede inyectar un secreto (WEBHOOK_SECRET) que n8n valide (Header Auth).
//
// Variables en Vercel:
//   WEBHOOK_SIMULADOR = https://.../webhook/circulo-simulador   (recomendado)
//   WEBHOOK_SECRET    = <secreto que n8n valida en el nodo Webhook>  (opcional)
//   DASHBOARD_TOKEN   = <clave de acceso del dashboard>              (recomendado)
// ─────────────────────────────────────────────────────────────────────────────
import { timingSafeEqual } from 'node:crypto'

// Permite hasta 60s: el flujo n8n hace una espera (~5s) antes de responder.
export const config = { maxDuration: 60 }

const clean = (v) => (v || '').trim().replace(/^['"]|['"]$/g, '')
const APP_KEY = clean(process.env.DASHBOARD_TOKEN)
const WEBHOOK = clean(
  process.env.WEBHOOK_SIMULADOR ||
    process.env.WEBHOOK_URL ||
    'https://n8n-n8n.pzqn6b.easypanel.host/webhook/circulo-manychat',
).replace(/\/$/, '')
const WEBHOOK_SECRET = clean(process.env.WEBHOOK_SECRET)

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''))
  const bb = Buffer.from(String(b || ''))
  if (ba.length !== bb.length || ba.length === 0) return false
  return timingSafeEqual(ba, bb)
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido.' })
    return
  }
  // Candado deny-by-default (inerte hasta que exista DASHBOARD_TOKEN).
  if (APP_KEY && !safeEqual((req.headers['x-app-key'] || '').toString(), APP_KEY)) {
    res.status(401).json({ error: 'No autorizado.' })
    return
  }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 55000)
  try {
    const headers = { 'content-type': 'application/json' }
    if (WEBHOOK_SECRET) headers['x-webhook-secret'] = WEBHOOK_SECRET
    const r = await fetch(WEBHOOK, {
      method: 'POST',
      headers,
      body: JSON.stringify(body || {}),
      signal: ctrl.signal,
    })
    const text = await r.text()
    res.setHeader('content-type', 'application/json')
    res.status(r.ok ? 200 : 502).send(text || '{}')
  } catch (e) {
    console.error('agente proxy error', e && e.name)
    res.status(504).json({ error: 'El agente no respondió a tiempo.' })
  } finally {
    clearTimeout(timer)
  }
}
