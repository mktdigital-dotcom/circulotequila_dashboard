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
