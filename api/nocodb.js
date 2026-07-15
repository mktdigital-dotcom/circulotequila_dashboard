// ─────────────────────────────────────────────────────────────────────────────
// api/nocodb.js · Serverless function (Vercel) — proxy seguro a NocoDB.
//
// El dashboard llama /api/nocodb?resource=leads desde su propio dominio, así que
// NO hay problema de CORS y el token NUNCA llega al navegador: vive solo aquí,
// del lado del servidor, en la variable de entorno NOCODB_TOKEN de Vercel.
//
// Config en Vercel (Settings → Environment Variables):
//   NOCODB_TOKEN = <tu API token de NocoDB>   (obligatorio)
//   NOCODB_HOST  = https://n8n-nocodb.pzqn6b.easypanel.host   (opcional, ya por defecto)
// ─────────────────────────────────────────────────────────────────────────────

import { timingSafeEqual } from 'node:crypto'

const HOST = (process.env.NOCODB_HOST || 'https://n8n-nocodb.pzqn6b.easypanel.host').replace(/\/$/, '')
// Acepta varios nombres comunes por si la variable se nombró distinto en Vercel.
// NO se aceptan nombres con prefijo VITE_: Vite los expondría en el bundle del
// navegador — un token nunca debe llegar al cliente.
const TOKEN_NAMES = ['NOCODB_TOKEN', 'NOCODB_API_TOKEN', 'NC_TOKEN', 'XC_TOKEN', 'NOCO_TOKEN']

// Candado de acceso (deny-by-default). Si DASHBOARD_TOKEN está configurado en
// Vercel, TODA petición exige el header `x-app-key` con ese valor; si no, 401.
// Mientras no se configure, el endpoint sigue abierto (rollout sin lockout) —
// pero configurarlo es lo recomendado (ver docs/SECURITY_AUDIT.md).
const APP_KEY = (process.env.DASHBOARD_TOKEN || '').trim().replace(/^['"]|['"]$/g, '')
function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''))
  const bb = Buffer.from(String(b || ''))
  if (ba.length !== bb.length || ba.length === 0) return false
  return timingSafeEqual(ba, bb)
}
// Limpia espacios, saltos de línea y comillas que a veces se cuelan al pegar en Vercel.
const RAW_TOKEN = TOKEN_NAMES.map((n) => process.env[n]).find(Boolean) || ''
const TOKEN = RAW_TOKEN.trim().replace(/^['"]|['"]$/g, '')

// NocoDB acepta el token por 'xc-token' (API tokens) o 'Authorization: Bearer'
// (personal access tokens nc_pat_ en versiones recientes). Probamos ambos.
async function ncFetch(url) {
  let res = await fetch(url, { headers: { 'xc-token': TOKEN, accept: 'application/json' } })
  if (res.status === 401) {
    res = await fetch(url, { headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/json' } })
  }
  return res
}

// Instancia pzqn6b · base "Circulo Tequila Proceso Comercial" (ppqrrdcbc6zxi9h)
// Tablas tomadas del flujo real "Círculo WEB" (donde el agente escribe).
const TABLES = {
  leads: 'm29hmkkqhrq8wev', // Leads
  signals: 'mm1dc5yyzuspkiw', // Mensajes (línea de tiempo por lead)
  senales: 'mqbezsfl3302vl5', // Señales
}

// Notas de prueba (compartidas entre Libia y Kenia): tabla "Notas" en la misma
// base. Se resuelve por NOMBRE para no tener que copiar el id — basta con crear
// en NocoDB una tabla llamada "Notas" con columnas: lead_id, autor, texto, ts.
const BASE_ID = process.env.NOCODB_BASE || 'ppqrrdcbc6zxi9h'
let _notasTableId = process.env.NOCODB_NOTAS_TABLE || null
async function getNotasTableId() {
  if (_notasTableId) return _notasTableId
  const res = await ncFetch(`${HOST}/api/v2/meta/bases/${BASE_ID}/tables`)
  if (!res.ok) throw new Error(`No se pudo listar tablas (${res.status})`)
  const data = await res.json()
  const t = (data.list || []).find((x) => /^notas?$/i.test((x.title || '').toString().trim()))
  if (!t) throw new Error('Falta la tabla "Notas" en NocoDB. Créala con columnas: lead_id, autor, texto, ts.')
  _notasTableId = t.id
  return _notasTableId
}

async function ncWrite(method, tableId, body) {
  const url = `${HOST}/api/v2/tables/${tableId}/records`
  const opts = (h) => ({ method, headers: { ...h, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) })
  let res = await fetch(url, opts({ 'xc-token': TOKEN }))
  if (res.status === 401) res = await fetch(url, opts({ authorization: `Bearer ${TOKEN}` }))
  return res
}
const ncCreate = (tableId, fields) => ncWrite('POST', tableId, fields)

// Clasificación automática de motivo_perdida (resultado #8) — SOLO para leads
// perdidos ANTES del handoff (etapa 1-4). Lee los mensajes que "Círculo WEB" ya
// registra en la tabla Mensajes y busca objeciones conocidas (manual operativo
// §05.3 / secuencias). Los perdidos DESPUÉS del handoff no tienen mensajes que
// leer aquí (el vendedor usa su propio WhatsApp, fuera del sistema) y se dejan
// sin tocar — esos los llena Kenia a mano desde su junta semanal.
const ETAPA_NUM = {
  nuevo: 1, 'en conversacion': 2, conversacion: 2, calificado: 3, interesado: 4,
  transferido: 5, 'transferido a vendedor': 5, propuesta: 6, 'propuesta aprobada': 6,
  anticipo: 7, 'anticipo recibido': 7, brief: 8, 'brief completado': 8,
  diseno: 9, 'diseno autorizado': 9, produccion: 10, 'produccion y entrega': 10, entrega: 10,
}
const OBJECION_KEYWORDS = [
  { motivo: 'precio', patterns: ['caro', 'costoso', 'descuento', 'presupuesto'] },
  { motivo: 'competencia', patterns: ['otro tequila', 'mas barato', 'cuesta menos', 'otra marca'] },
  { motivo: 'timing', patterns: ['consultarlo', 'despues del evento', 'mas adelante', 'lo veo despues', 'lo pensare'] },
  { motivo: 'otro', patterns: ['maquila', 'mi propio tequila', 'envasar', 'no los conozco', 'no conozco la marca', 'solo quiero una', 'nada mas una botella'] },
]
const normTxt = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

async function clasificarObjeciones() {
  const [leadsRows, signalRows] = await Promise.all([fetchAll(TABLES.leads), fetchAll(TABLES.signals)])
  const msgsByLead = {}
  for (const m of signalRows) {
    const f = m.fields || m
    const lid = (f.lead_id || '').toString().trim()
    if (!lid) continue
    ;(msgsByLead[lid] ||= []).push(normTxt(f.texto))
  }

  const detalle = []
  for (const row of leadsRows) {
    const f = row.fields || row
    const leadId = (f.lead_id || '').toString().trim()
    if (!leadId) continue
    if ((f.motivo_perdida || '').toString().trim()) continue // ya clasificado

    const perdidoAt = (f.perdido_at || '').toString().trim()
    const estado = (f.estado || '').toString().trim()
    const etapaN = normTxt(f.etapa)
    const stage = ETAPA_NUM[etapaN] ?? null
    const perdida = !!perdidoAt || estado === 'cerrado_sin_respuesta' || etapaN === 'perdido' || etapaN === 'reactivacion'
    const esPreHandoff = stage != null ? stage < 5 : true // si no hay etapa mapeada, se asume aún no transferido
    if (!perdida || !esPreHandoff) continue

    const textos = (msgsByLead[leadId] || []).join(' \n ')
    let motivo = null
    for (const { motivo: m, patterns } of OBJECION_KEYWORDS) {
      if (patterns.some((p) => textos.includes(p))) { motivo = m; break }
    }
    if (!motivo) motivo = 'otro' // sin palabra clave clara (silencio u otro motivo no mapeado)

    const fields = { motivo_perdida: motivo }
    if (!perdidoAt) fields.perdido_at = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const r = await ncWrite('PATCH', TABLES.leads, { Id: row.Id ?? row.id, ...fields })
    if (r.ok) detalle.push({ lead_id: leadId, motivo_perdida: motivo })
    else console.error('clasificar patch error', leadId, r.status)
  }
  return detalle
}

async function fetchAll(tableId) {
  const rows = []
  let page = 1
  // NocoDB v2: /api/v2/tables/{tableId}/records — pagina de 200 en 200.
  for (let guard = 0; guard < 50; guard++) {
    const url = `${HOST}/api/v2/tables/${tableId}/records?limit=200&page=${page}`
    const res = await ncFetch(url)
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`NocoDB ${res.status}: ${body.slice(0, 300)}`)
    }
    const data = await res.json()
    const list = data.list || []
    rows.push(...list)
    if (data.pageInfo?.isLastPage || list.length === 0) break
    page++
  }
  return rows
}

// Verifica que la llamada venga del Cron Scheduler de Vercel (no de cualquiera
// que adivine la URL). Vercel manda "Authorization: Bearer <CRON_SECRET>" solo
// en las llamadas que él mismo dispara, cuando CRON_SECRET está configurado en
// Settings → Environment Variables. Sin esa variable, el cron simplemente no
// puede ejecutar la clasificación (falla cerrado, no abierto).
const CRON_SECRET = (process.env.CRON_SECRET || '').trim()
function esLlamadaDeCron(req) {
  if (!CRON_SECRET) return false
  return safeEqual((req.headers.authorization || '').toString(), `Bearer ${CRON_SECRET}`)
}

export default async function handler(req, res) {
  // Cabeceras de seguridad en toda respuesta.
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')

  // Cron semanal (vercel.json → GET /api/nocodb?op=clasificar). Se valida ANTES
  // del candado normal porque el Cron Scheduler no manda el header x-app-key —
  // manda su propio Bearer verificado arriba.
  if (req.method === 'GET' && (req.query?.op || '') === 'clasificar') {
    if (!esLlamadaDeCron(req)) { res.status(401).json({ error: 'No autorizado.' }); return }
    try {
      const detalle = await clasificarObjeciones()
      res.status(200).json({ ok: true, origen: 'cron', clasificados: detalle.length, detalle })
    } catch (e) {
      console.error('clasificar (cron) error', e)
      res.status(502).json({ error: 'No se pudo clasificar objeciones' })
    }
    return
  }

  // Candado deny-by-default (aplica a TODO, incluido diag) cuando hay APP_KEY.
  if (APP_KEY && !safeEqual((req.headers['x-app-key'] || '').toString(), APP_KEY)) {
    res.status(401).json({ error: 'No autorizado.' })
    return
  }

  // Diagnóstico: /api/nocodb?diag=1 → prueba la conexión sin revelar el token
  // ni detalles de infraestructura (solo estados booleanos).
  if (req.query?.diag != null) {
    const probeUrl = `${HOST}/api/v2/tables/${TABLES.leads}/records?limit=1`
    const out = { ok: true, funcionServerless: 'activa', tokenDetectado: !!TOKEN, candadoActivo: !!APP_KEY }
    if (TOKEN) {
      try {
        const r1 = await fetch(probeUrl, { headers: { 'xc-token': TOKEN, accept: 'application/json' } })
        const r2 = r1.ok ? r1 : await fetch(probeUrl, { headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/json' } })
        out.conexionOk = r1.ok || r2.ok
      } catch {
        out.conexionOk = false
      }
    }
    res.status(200).json(out)
    return
  }
  if (!TOKEN) {
    res.status(500).json({
      error: 'Falta el token de NocoDB. Crea la variable NOCODB_TOKEN en Vercel (Settings → Environment Variables) para el entorno del deploy (Production y/o Preview) y vuelve a desplegar.',
      buscadas: TOKEN_NAMES,
    })
    return
  }
  const resource = (req.query?.resource || 'leads').toString()
  const op = (req.query?.op || '').toString()

  // Clasificación automática de motivo_perdida (resultado #8), solo pre-handoff.
  // POST /api/nocodb?op=clasificar
  if (req.method === 'POST' && op === 'clasificar') {
    try {
      const detalle = await clasificarObjeciones()
      res.status(200).json({ ok: true, clasificados: detalle.length, detalle })
    } catch (e) {
      console.error('clasificar error', e)
      res.status(502).json({ error: 'No se pudo clasificar objeciones' })
    }
    return
  }

  // Escritura: crear una nota de prueba (compartida). POST /api/nocodb?resource=notas
  if (req.method === 'POST') {
    if (resource !== 'notas') {
      res.status(400).json({ error: 'Solo se puede escribir en "notas".' })
      return
    }
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
    const fields = {
      lead_id: (body?.lead_id || '').toString().trim(),
      autor: (body?.autor || '').toString().trim() || 'anónimo',
      texto: (body?.texto || '').toString().trim(),
      ts: (body?.ts || '').toString().trim() || new Date().toISOString().slice(0, 16).replace('T', ' '),
    }
    if (!fields.lead_id || !fields.texto) {
      res.status(400).json({ error: 'Faltan lead_id o texto.' })
      return
    }
    try {
      const tid = await getNotasTableId()
      const r = await ncCreate(tid, fields)
      const txt = await r.text()
      if (!r.ok) { console.error('notas create', r.status, txt.slice(0, 300)); res.status(502).json({ error: 'No se pudo guardar la nota' }); return }
      res.status(200).json({ ok: true, nota: JSON.parse(txt) })
    } catch (e) {
      console.error('notas create error', e)
      res.status(502).json({ error: 'No se pudo guardar la nota' })
    }
    return
  }

  // Edición compartida: actualizar un lead por su Id de NocoDB. Así lo que edita
  // o mueve una persona en el dashboard queda en la base y todos lo ven.
  // PATCH /api/nocodb?resource=leads  body: { Id, ...campos }
  if (req.method === 'PATCH' || (req.method === 'POST' && (req.query?.op || '') === 'update')) {
    if (resource !== 'leads') {
      res.status(400).json({ error: 'Solo se puede editar "leads".' })
      return
    }
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
    const id = body?.Id ?? body?.id
    if (id == null) { res.status(400).json({ error: 'Falta el Id del lead.' }); return }
    const { Id, id: _omit, ...fields } = body
    try {
      const r = await ncWrite('PATCH', TABLES.leads, { Id: id, ...fields })
      const txt = await r.text()
      if (!r.ok) { console.error('lead patch', r.status, txt.slice(0, 300)); res.status(502).json({ error: 'No se pudo actualizar el lead' }); return }
      res.status(200).json({ ok: true, lead: JSON.parse(txt) })
    } catch (e) {
      console.error('lead patch error', e)
      res.status(502).json({ error: 'No se pudo actualizar el lead' })
    }
    return
  }

  // Solo lectura de aquí en adelante.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Método no permitido.' })
    return
  }

  // Lectura. `notas` resuelve su tabla por nombre; si aún no existe, lista vacía.
  let tableId = TABLES[resource]
  if (resource === 'notas') {
    try { tableId = await getNotasTableId() } catch { res.status(200).json({ resource, count: 0, list: [], nota: 'tabla Notas no creada' }); return }
  }
  if (!tableId) {
    res.status(400).json({ error: `Recurso desconocido: ${resource}`, disponibles: [...Object.keys(TABLES), 'notas'] })
    return
  }
  try {
    const list = await fetchAll(tableId)
    // Con candado activo NO se cachea en el edge (evita servir datos sin la key);
    // sin candado, cache ligera para rendimiento.
    res.setHeader('Cache-Control', APP_KEY ? 'private, no-store' : 's-maxage=15, stale-while-revalidate=60')
    res.status(200).json({ resource, count: list.length, list, fetchedAt: new Date().toISOString() })
  } catch (e) {
    console.error('read error', resource, e)
    res.status(502).json({ error: 'No se pudo leer NocoDB' })
  }
}
