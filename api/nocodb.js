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

const HOST = (process.env.NOCODB_HOST || 'https://n8n-nocodb.pzqn6b.easypanel.host').replace(/\/$/, '')
// Acepta varios nombres comunes por si la variable se nombró distinto en Vercel.
const TOKEN_NAMES = ['NOCODB_TOKEN', 'VITE_NOCODB_TOKEN', 'NOCODB_API_TOKEN', 'NC_TOKEN', 'XC_TOKEN', 'NOCO_TOKEN']
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

export default async function handler(req, res) {
  // Diagnóstico: /api/nocodb?diag=1 → prueba la conexión real y reporta qué
  // método de auth funciona, sin revelar el token.
  if (req.query?.diag != null) {
    const probeUrl = `${HOST}/api/v2/tables/${TABLES.leads}/records?limit=1`
    const out = {
      ok: true,
      funcionServerless: 'activa',
      tokenDetectado: !!TOKEN,
      variableUsada: TOKEN_NAMES.find((n) => process.env[n]) || null,
      tokenPrefijo: TOKEN ? TOKEN.slice(0, 7) : null, // ej. "nc_pat_"
      tokenLongitud: TOKEN.length, // para detectar truncado/espacios
      host: HOST,
    }
    if (TOKEN) {
      try {
        const r1 = await fetch(probeUrl, { headers: { 'xc-token': TOKEN, accept: 'application/json' } })
        out.pruebaXcToken = r1.status
        const r2 = await fetch(probeUrl, { headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/json' } })
        out.pruebaBearer = r2.status
        out.conexionOk = r1.ok || r2.ok
        if (!r1.ok && !r2.ok) out.detalle = (await r1.text()).slice(0, 200)
      } catch (e) {
        out.errorRed = String(e.message || e)
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
      if (!r.ok) { res.status(502).json({ error: 'No se pudo guardar la nota', detail: txt.slice(0, 300) }); return }
      res.status(200).json({ ok: true, nota: JSON.parse(txt) })
    } catch (e) {
      res.status(502).json({ error: String(e.message || e) })
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
      if (!r.ok) { res.status(502).json({ error: 'No se pudo actualizar el lead', detail: txt.slice(0, 300) }); return }
      res.status(200).json({ ok: true, lead: JSON.parse(txt) })
    } catch (e) {
      res.status(502).json({ error: String(e.message || e) })
    }
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
    // Cache ligera en el edge: sirve al instante y revalida en segundo plano.
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60')
    res.status(200).json({ resource, count: list.length, list, fetchedAt: new Date().toISOString() })
  } catch (e) {
    res.status(502).json({ error: 'No se pudo leer NocoDB', detail: String(e.message || e) })
  }
}
