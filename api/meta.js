// ─────────────────────────────────────────────────────────────────────────────
// api/meta.js · Proxy seguro (Vercel) a la Meta Marketing API (Graph API).
//
// El dashboard llama /api/meta desde su propio dominio; el token vive SOLO aquí
// (variables de entorno de Vercel), nunca en el navegador. Devuelve el
// rendimiento por anuncio (gasto, impresiones, clics, alcance, mensajes, CPL).
//
// Variables en Vercel:
//   META_ACCESS_TOKEN    = token de la App de Meta (ads_read)          (obligatorio)
//   META_AD_ACCOUNT_ID   = act_637824170121322  (con o sin "act_")     (obligatorio)
//   META_APP_ID          = App ID                                       (opcional)
//   META_API_VERSION     = v21.0 (por defecto)                          (opcional)
//   DASHBOARD_TOKEN      = candado del dashboard (mismo que /api/nocodb)(recomendado)
// ─────────────────────────────────────────────────────────────────────────────
import { timingSafeEqual } from 'node:crypto'

const clean = (v) => (v || '').trim().replace(/^['"]|['"]$/g, '')
const pick = (names) => { for (const n of names) { const v = clean(process.env[n]); if (v) return v } return '' }
// Tolerante a variaciones de nombre en Vercel (mayúsculas, guiones, sin _ID…).
const TOKEN = pick(['META_ACCESS_TOKEN', 'META_TOKEN', 'META_ACCESSTOKEN', 'METAACCESSTOKEN', 'FB_ACCESS_TOKEN', 'META_MARKETING_TOKEN'])
const RAW_ACCOUNT = pick(['META_AD_ACCOUNT_ID', 'META_AD_ACCOUNT', 'META_ADACCOUNT_ID', 'META_ACCOUNT_ID', 'METAADACCOUNTID', 'AD_ACCOUNT_ID', 'META_AD_ACCOUNTID'])
const ACCOUNT = RAW_ACCOUNT ? (RAW_ACCOUNT.startsWith('act_') ? RAW_ACCOUNT : 'act_' + RAW_ACCOUNT) : ''
const VERSION = pick(['META_API_VERSION', 'META_VERSION']) || 'v21.0'
const GRAPH = 'https://graph.facebook.com'
const APP_KEY = clean(process.env.DASHBOARD_TOKEN)

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''))
  const bb = Buffer.from(String(b || ''))
  if (ba.length !== bb.length || ba.length === 0) return false
  return timingSafeEqual(ba, bb)
}

const RANGES = { hoy: 'today', '7d': 'last_7d', '30d': 'last_30d', '90d': 'last_90d', max: 'maximum' }
const num = (v) => (v == null || v === '' ? null : Number(v))

// De la lista `actions` de Meta saca los "mensajes iniciados" (CTWA / WhatsApp).
function mensajesDe(actions) {
  if (!Array.isArray(actions)) return null
  let total = 0
  let hit = false
  for (const a of actions) {
    const t = (a.action_type || '').toString()
    if (/messaging_conversation_started|messaging_first_reply|onsite_conversion\.messaging/.test(t)) {
      total += Number(a.value) || 0
      hit = true
    }
  }
  return hit ? total : null
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')

  // Diagnóstico (sin candado y sin revelar el token): abrilo en el navegador
  // /api/meta?diag=1 para ver EXACTAMENTE qué detecta el servidor.
  if (req.query?.diag != null) {
    res.status(200).json({
      ok: true,
      tokenDetectado: !!TOKEN,
      cuentaDetectada: !!ACCOUNT,
      cuenta: ACCOUNT || null,
      version: VERSION,
      variablesVisibles: Object.keys(process.env).filter((k) => /^META|AD_ACCOUNT/i.test(k)),
    })
    return
  }

  if (APP_KEY && !safeEqual((req.headers['x-app-key'] || '').toString(), APP_KEY)) {
    res.status(401).json({ error: 'No autorizado.' })
    return
  }

  if (!TOKEN || !ACCOUNT) {
    const faltan = [!TOKEN && 'META_ACCESS_TOKEN (el token)', !ACCOUNT && 'META_AD_ACCOUNT_ID (la cuenta act_...)'].filter(Boolean)
    res.status(500).json({
      error: `Falta configurar en Vercel: ${faltan.join(' y ')}. Revisa el nombre exacto y haz Redeploy.`,
    })
    return
  }

  const preset = RANGES[(req.query?.range || '30d').toString()] || 'last_30d'
  const fields = [
    'ad_id',
    'ad_name',
    'campaign_name',
    'adset_name',
    'spend',
    'impressions',
    'clicks',
    'ctr',
    'cpc',
    'cpm',
    'reach',
    'actions',
  ].join(',')
  const url =
    `${GRAPH}/${VERSION}/${ACCOUNT}/insights` +
    `?level=ad&fields=${fields}&date_preset=${preset}&limit=500&access_token=${encodeURIComponent(TOKEN)}`

  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } })
    const data = await r.json().catch(() => ({}))
    if (!r.ok || data.error) {
      // No filtrar el token; sí un mensaje útil de Meta (código + tipo).
      const e = data.error || {}
      console.error('meta insights', r.status, e.message)
      res.status(502).json({
        error: 'Meta rechazó la consulta.',
        metaCode: e.code ?? r.status,
        metaMensaje: e.message || 'Error desconocido',
        pista: e.code === 190 ? 'Token inválido o expirado — regenéralo.' : e.code === 200 ? 'Faltan permisos (ads_read) sobre la cuenta.' : undefined,
      })
      return
    }

    const rows = (data.data || []).map((a) => {
      const spend = num(a.spend)
      const mensajes = mensajesDe(a.actions)
      return {
        adId: a.ad_id || '',
        anuncio: a.ad_name || '(sin nombre)',
        campana: a.campaign_name || '',
        conjunto: a.adset_name || '',
        gasto: spend,
        impresiones: num(a.impressions),
        clics: num(a.clicks),
        ctr: num(a.ctr),
        cpc: num(a.cpc),
        cpm: num(a.cpm),
        alcance: num(a.reach),
        mensajes,
        cpl: mensajes && spend != null ? Number((spend / mensajes).toFixed(2)) : null,
      }
    })

    const sum = (k) => rows.reduce((s, x) => s + (x[k] || 0), 0)
    const total = {
      anuncios: rows.length,
      gasto: Number(sum('gasto').toFixed(2)),
      impresiones: sum('impresiones'),
      clics: sum('clics'),
      alcance: sum('alcance'),
      mensajes: sum('mensajes'),
    }
    total.cpl = total.mensajes ? Number((total.gasto / total.mensajes).toFixed(2)) : null

    res.setHeader('Cache-Control', APP_KEY ? 'private, no-store' : 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({
      ok: true,
      cuenta: ACCOUNT,
      periodo: preset,
      total,
      anuncios: rows.sort((a, b) => (b.gasto || 0) - (a.gasto || 0)),
      fetchedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('meta proxy error', e && e.name)
    res.status(502).json({ error: 'No se pudo contactar a Meta.' })
  }
}
