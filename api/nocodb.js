// ─────────────────────────────────────────────────────────────────────────────
// api/nocodb.js · Serverless function (Vercel) — proxy seguro a NocoDB.
//
// El dashboard llama /api/nocodb?resource=leads desde su propio dominio, así que
// NO hay problema de CORS y el token NUNCA llega al navegador: vive solo aquí,
// del lado del servidor, en la variable de entorno NOCODB_TOKEN de Vercel.
//
// Config en Vercel (Settings → Environment Variables):
//   NOCODB_TOKEN = <tu API token de NocoDB>   (obligatorio)
//   NOCODB_HOST  = https://n8n-nocodb.slmipf.easypanel.host   (opcional, ya por defecto)
// ─────────────────────────────────────────────────────────────────────────────

const HOST = (process.env.NOCODB_HOST || 'https://n8n-nocodb.slmipf.easypanel.host').replace(/\/$/, '')
// Acepta varios nombres comunes por si la variable se nombró distinto en Vercel.
const TOKEN_NAMES = ['NOCODB_TOKEN', 'VITE_NOCODB_TOKEN', 'NOCODB_API_TOKEN', 'NC_TOKEN', 'XC_TOKEN', 'NOCO_TOKEN']
const TOKEN = TOKEN_NAMES.map((n) => process.env[n]).find(Boolean) || ''

// Base "Proceso Comercial - Circulo Tequila" (pw5fbulfxbvr6ko)
const TABLES = {
  leads: 'm2iuluccpx3i11o',
  signals: 'mebd3yz1aj8e291',
  catalogo: 'mrbt25f6tfuafmv',
  plantilla: 'mf9unimceympa4b',
  rubrica: 'mw8ifbh4qmln0gd',
  documentacion: 'm5jrvujitikscef',
  descripcionUso: 'mrdekwjfxu5e2y9',
}

async function fetchAll(tableId) {
  const rows = []
  let page = 1
  // NocoDB v2: /api/v2/tables/{tableId}/records — pagina de 200 en 200.
  for (let guard = 0; guard < 50; guard++) {
    const url = `${HOST}/api/v2/tables/${tableId}/records?limit=200&page=${page}`
    const res = await fetch(url, { headers: { 'xc-token': TOKEN, accept: 'application/json' } })
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
  // Diagnóstico: /api/nocodb?diag=1 → confirma que la función corre y si ve el token
  // (sin revelarlo). Sirve para verificar el deploy desde el navegador.
  if (req.query?.diag != null) {
    res.status(200).json({
      ok: true,
      funcionServerless: 'activa',
      tokenDetectado: !!TOKEN,
      variableUsada: TOKEN_NAMES.find((n) => process.env[n]) || null,
      host: HOST,
    })
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
  const tableId = TABLES[resource]
  if (!tableId) {
    res.status(400).json({ error: `Recurso desconocido: ${resource}`, disponibles: Object.keys(TABLES) })
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
