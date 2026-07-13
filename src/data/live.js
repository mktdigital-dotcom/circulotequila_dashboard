// ─────────────────────────────────────────────────────────────────────────────
// live.js · Capa de datos en vivo desde NocoDB (vía /api/nocodb de Vercel).
//
// Alineado a la arquitectura comercial validada con Kenia (v.2026.06b):
// - Filtra filas vacías / de documentación (solo leads reales: lead_id = L-####).
// - Traduce `etapa` (incl. en_conversacion, perdido) al pipeline de 10 etapas.
// - Usa `estatus_mkt` (vocabulario de Kenia, §13) para el próximo toque.
// - Une Signal_log como línea de tiempo real por lead (§13: bitácora append-only).
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react'
import { detectChannel } from './simLogic.js'

const norm = (s) =>
  (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\s]+/g, ' ').trim()

// etapa (texto en NocoDB) → nº de etapa (1–10) o pseudo-etapa 'reactivacion'.
const ETAPA_TO_STAGE = {
  nuevo: 1,
  'en conversacion': 2,
  conversacion: 2,
  calificado: 3,
  interesado: 4,
  transferido: 5,
  'transferido a vendedor': 5,
  propuesta: 6,
  'propuesta aprobada': 6,
  anticipo: 7,
  'anticipo recibido': 7,
  brief: 8,
  'brief completado': 8,
  diseno: 9,
  'diseno autorizado': 9,
  produccion: 10,
  'produccion y entrega': 10,
  entrega: 10,
  perdido: 'reactivacion',
  reactivacion: 'reactivacion',
}

// nº de etapa (o 'reactivacion') → etapa (texto que guarda NocoDB). Para que al
// mover una tarjeta en el Pipeline se escriba la etapa correcta en la base.
const STAGE_TO_ETAPA = {
  1: 'nuevo',
  2: 'en_conversacion',
  3: 'calificado',
  4: 'interesado',
  5: 'transferido',
  6: 'propuesta',
  7: 'anticipo',
  8: 'brief',
  9: 'diseno',
  10: 'produccion',
  reactivacion: 'perdido',
}
export const etapaDeStage = (stage) => STAGE_TO_ETAPA[stage] || 'nuevo'

// Origen real del lead (campaña) → etiqueta legible. Es "de dónde viene", no el
// canal técnico (que casi siempre es whatsapp).
const ORIGEN_LABEL = {
  web_general: 'Web · general',
  web_popup_empresarial: 'Web · empresarial',
  campana_gdl: 'Meta · Guadalajara',
  campana_cdmx: 'Meta · CDMX',
  campana_rm: 'Meta · Riviera Maya',
  campana_slp: 'Meta · SLP',
}
const ORIGEN_TONE = {
  web_general: 'gold',
  web_popup_empresarial: 'gold',
  campana_gdl: 'green',
  campana_cdmx: 'teal',
  campana_rm: 'blue',
  campana_slp: 'orange',
}

// País a partir del prefijo del teléfono (contacto). Cae a México por ciudad MX.
const LADA_PAIS = [
  ['+52', 'México'],
  ['+1', 'EE.UU./Canadá'],
  ['+505', 'Nicaragua'],
  ['+506', 'Costa Rica'],
  ['+507', 'Panamá'],
  ['+57', 'Colombia'],
  ['+51', 'Perú'],
  ['+56', 'Chile'],
  ['+54', 'Argentina'],
  ['+34', 'España'],
]
const CIUDADES_MX = ['gdl', 'guadalajara', 'cdmx', 'riviera maya', 'slp', 'san luis potosi', 'monterrey', 'puerto vallarta', 'leon', 'queretaro']
function paisDe(contacto, ciudad) {
  const c = (contacto || '').toString().replace(/\s/g, '')
  for (const [lada, pais] of LADA_PAIS) if (c.startsWith(lada)) return pais
  if (CIUDADES_MX.includes(norm(ciudad))) return 'México'
  return '—'
}

// estatus_mkt (§13, vocabulario de Kenia) → próximo toque sugerido.
const ESTATUS_NEXT = {
  'en espera para enviar costos': 'Enviar lista de precios del canal',
  'se enviaron costos': 'Dar seguimiento tras enviar costos',
  'sin respuesta despues de enviar costos': '⚠ Reactivar: sin respuesta tras costos',
  'pendiente confirmar llamada': 'Confirmar y agendar la llamada',
  'lead enviado': 'Handoff a asesor de la ciudad',
  'se envio link de tienda': 'Seguimiento de compra en Amazon/tienda',
  'no esta interesado': 'Descartado — evaluar reactivación futura',
}

const VENDEDOR_CIUDAD = { GDL: 'Vendedor GDL', CDMX: 'Vendedor CDMX', 'Riviera Maya': 'Vendedor Riviera Maya' }
const PRECIO_BOTELLA = 2250 // estimación de valor (línea empresarial 750 ml)

// Solo son leads reales las filas con lead_id tipo "L-0001" (filtra vacías y notas).
// Un lead cuenta si su lead_id es un folio L-#### (leads "de negocio") O una
// sesión del webhook/simulador `mc_<telefono>` (así el Pipeline muestra la MISMA
// fila que NocoDB guarda, no una copia local). Filtra encabezados/notas vacías.
const LEAD_ID_RE = /^L-?\d{1,6}$/i
const SESSION_ID_RE = /^mc_/i
const idDe = (row) => (row?.lead_id || '').toString().trim()
export const isRealLead = (row) => LEAD_ID_RE.test(idDe(row)) || SESSION_ID_RE.test(idDe(row))
export const isRealSignal = (row) => LEAD_ID_RE.test(idDe(row)) || SESSION_ID_RE.test(idDe(row))
// Teléfonos de prueba (3 fijos + sintéticos +521555 de "Nueva prueba"): marcan
// el lead como 🧪 sin sacarlo de NocoDB.
const TEST_PHONE_RE = /521555\d|6682217601|6682322911|2345678901/
export const esLeadDePrueba = (leadId) => TEST_PHONE_RE.test((leadId || '').toString())

function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(d)) return null
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000))
}

const relLabel = (dateStr) => {
  const d = daysSince(dateStr)
  if (d == null) return '—'
  if (d === 0) return 'hoy'
  if (d === 1) return 'hace 1 día'
  return `hace ${d} días`
}

export function mapLeadRowToCard(row) {
  const botellas = parseInt(row.botellas, 10)
  const bot = Number.isFinite(botellas) ? botellas : null
  const stage = ETAPA_TO_STAGE[norm(row.etapa)] ?? 1
  const tier = (row.tier || '').toString().trim().toUpperCase() || null
  const score = row.score != null && row.score !== '' ? Number(row.score) : null
  const ciudad = row.ciudad || '—'
  // La columna real en NocoDB se llama `estatus` (el flujo n8n la escribe así);
  // se acepta también `estatus_mkt` por si algún día se renombra.
  const estatus = (row.estatus_mkt || row.estatus || '').toString().trim()
  const owner = (row.owner || '').toString().trim()

  const leadId = (row.lead_id || '').toString().trim()
  const esPrueba = esLeadDePrueba(leadId)

  const tags = []
  if (esPrueba) tags.push('prueba')
  if (tier) tags.push('tier ' + tier)
  if (row.linea) tags.push(row.linea)
  if (stage === 'reactivacion') tags.push('reactivación')

  return {
    id: leadId,
    esPrueba,
    ncId: row.Id ?? null,
    stage,
    name: (row.nombre || row.lead_id || 'Lead sin nombre') + (esPrueba ? ' 🧪' : ''),
    empresa: row.nombre || '',
    ciudad,
    bot: bot != null ? bot + ' bot' : '— bot',
    volumen: bot ?? undefined,
    ocasion: row['propósito'] || row.proposito || 'sin especificar',
    proposito: row['propósito'] || row.proposito || '',
    value: bot != null ? bot * PRECIO_BOTELLA : null,
    valor: bot != null ? bot * PRECIO_BOTELLA : null,
    valueEstimated: bot != null,
    tier,
    score,
    canal: row.canal || '',
    linea: row.linea || '',
    campana: row['campaña'] || row.campana || '',
    origen: ORIGEN_LABEL[(row['campaña'] || row.campana || '').toString()] || (row.canal || 'directo'),
    pais: paisDe(row.contacto, row.ciudad),
    anuncio: row.anuncio || '',
    contacto: row.contacto || '',
    fecha: row.fecha || '',
    etapaTxt: row.etapa || '',
    estatusMkt: estatus,
    ciudadValidada: row.ciudad_validada || '',
    tipoLead: row.tipo_lead || '',
    contexto: row.contexto || '',
    requalifyAt: row.requalify_at || '',
    owner,
    // Derivados para Seguimientos / handoff. La tabla no tiene columna `owner`:
    // en etapas 1–4 el responsable ES el agente (§06); de 5+ el vendedor por ciudad.
    responsable:
      owner === 'agente' || (!owner && typeof stage === 'number' && stage < 5)
        ? 'Agente IA'
        : VENDEDOR_CIUDAD[row.ciudad_validada || ciudad] || owner || '—',
    vendedor: stage >= 5 ? VENDEDOR_CIUDAD[row.ciudad_validada || ciudad] || '—' : null,
    proximo:
      ESTATUS_NEXT[norm(estatus)] ||
      (stage === 'reactivacion' ? '⚠ Reactivar lead perdido' : 'Continuar la conversación'),
    tags,
    notes: [],
    events: [],
    ultima: relLabel(row.fecha),
    dias: daysSince(row.fecha),
  }
}

// Une las señales (Signal_log) a cada lead: línea de tiempo + última interacción.
function attachSignals(cards, signalRows) {
  const byLead = {}
  for (const s of signalRows.filter(isRealSignal)) {
    const lid = s.lead_id.toString().trim()
    // Tolerante a los dos esquemas: Signal_log (valor/detalle, tipo, actor) y
    // Mensajes (texto, emisor, etiqueta).
    ;(byLead[lid] ||= []).push({
      t: s.ts || '',
      e: s['valor/detalle'] || s.texto || s.etiqueta || s.tipo || 'evento',
      tipo: s.tipo || s.etiqueta || '',
      plantilla: s.plantilla_id || '',
      canal: s.canal || '',
      actor: s.actor || s.emisor || '',
    })
  }
  return cards.map((c) => {
    const evs = (byLead[c.id] || []).sort((a, b) => (a.t < b.t ? -1 : 1))
    if (!evs.length) return c
    const lastTs = evs[evs.length - 1].t
    const enriched = { ...c, events: evs }
    // Fallback de atribución: si NocoDB aún no trae `campaña`, deducirla de la
    // FRASE DE APERTURA del primer mensaje del cliente (misma lógica que n8n).
    // Fuente de verdad sigue siendo NocoDB; esto solo rellena mientras el flujo
    // no escriba el campo. `origenFuente` deja claro de dónde salió.
    if (!c.campana) {
      const primero = evs.find((e) => /client|usuari|lead/i.test(e.actor || '') || (!/agente|sistema|bot/i.test(e.actor || '') && e.e))
      const texto = (primero?.e || '').toString()
      if (texto) {
        const det = detectChannel(texto)
        if (det.campana) {
          enriched.campana = det.campana
          enriched.origen = ORIGEN_LABEL[det.campana] || enriched.origen
          enriched.origenFuente = 'frase de apertura'
          if (det.anuncio && !enriched.anuncio) enriched.anuncio = det.anuncio
          if (det.ciudad && !enriched.ciudad) enriched.ciudad = det.ciudad
          if (det.linea && !enriched.linea) enriched.linea = det.linea
        }
      }
    } else {
      enriched.origenFuente = 'NocoDB'
    }
    enriched.ultima = relLabel(lastTs) !== '—' ? relLabel(lastTs) : c.ultima
    enriched.dias = daysSince(lastTs) ?? c.dias
    return enriched
  })
}

// Une las notas de prueba (tabla Notas, compartidas) a cada lead por lead_id.
function attachNotas(cards, notaRows) {
  const byLead = {}
  for (const n of notaRows) {
    const lid = (n.lead_id || '').toString().trim()
    if (!lid) continue
    ;(byLead[lid] ||= []).push({
      autor: (n.autor || 'anónimo').toString(),
      texto: (n.texto || '').toString(),
      ts: (n.ts || '').toString(),
    })
  }
  return cards.map((c) => {
    const ns = byLead[c.id]
    if (!ns) return c
    return { ...c, notasLive: ns.sort((a, b) => (a.ts < b.ts ? -1 : 1)) }
  })
}

// KPIs derivados de los leads reales (Panel · Resumen del embudo).
export function leadsKpis(cards) {
  const total = cards.length
  const byTier = { A: 0, B: 0, C: 0, D: 0 }
  const byCiudad = {}
  const byCanal = {}
  const byLinea = {}
  const byStage = {}
  let scoreSum = 0
  let scoreN = 0
  for (const c of cards) {
    if (c.tier && byTier[c.tier] != null) byTier[c.tier]++
    if (c.ciudad) byCiudad[c.ciudad] = (byCiudad[c.ciudad] || 0) + 1
    if (c.canal) byCanal[c.canal] = (byCanal[c.canal] || 0) + 1
    if (c.linea) byLinea[c.linea] = (byLinea[c.linea] || 0) + 1
    byStage[c.stage] = (byStage[c.stage] || 0) + 1
    if (c.score != null && !Number.isNaN(c.score)) {
      scoreSum += c.score
      scoreN++
    }
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 6)
  // Embudo (etapas 1–4 marketing, 5+ comercial), conteo real.
  const numStages = Object.entries(byStage).filter(([k]) => k !== 'reactivacion')
  return {
    total,
    byTier,
    byStage,
    byLinea,
    topCiudades: top(byCiudad),
    topCanales: top(byCanal),
    scorePromedio: scoreN ? Math.round(scoreSum / scoreN) : null,
    calientes: byTier.A,
    enConversacion: (byStage[2] || 0) + (byStage[1] || 0),
    calificados: (byStage[3] || 0) + (byStage[4] || 0),
    aVentas: numStages.reduce((s, [k, v]) => (Number(k) >= 5 ? s + v : s), 0),
    reactivacion: byStage['reactivacion'] || 0,
  }
}

// Motivos de pérdida (§05.3 / §13) derivados del estatus de leads perdidos.
const LOSS_REASON = {
  'sin respuesta despues de enviar costos': 'Sin respuesta tras costos',
  'no esta interesado': 'No interesado',
  'se enviaron costos': 'Precio / presupuesto',
}
const CANAL_TONE = { whatsapp: 'golddim', web: 'gold', 'sitio web': 'gold', referido: 'green', referidos: 'green', evento: 'teal', eventos: 'teal', mailing: 'orange' }
const CANAL_LABEL = { whatsapp: 'Meta Ads · WhatsApp', web: 'Sitio web', 'sitio web': 'Sitio web' }
const TIER_VAL = { A: 4, B: 3, C: 2, D: 1 }

// Modelo completo del Panel a partir de los leads reales (Secciones 1, 3, 4, 5).
export function panelModel(cards) {
  const numStage = (c) => (typeof c.stage === 'number' ? c.stage : 0)
  const total = cards.length

  // ── Sección 1 · Embudo (acumulado, conteo real) ──
  const conv = cards.filter((c) => numStage(c) >= 2).length
  const cal = cards.filter((c) => numStage(c) >= 3).length
  const sales = cards.filter((c) => numStage(c) >= 5).length
  const won = cards.filter((c) => numStage(c) === 10).length
  const funnel = [
    { key: 'gen', label: 'Generados', value: total, dot: 'blue', sub: 'leads reales', note: '' },
    { key: 'conv', label: 'En conversación', value: conv, dot: 'teal', sub: 'respondió al 1er toque', note: '' },
    { key: 'cal', label: 'Calificados', value: cal, dot: 'gold', sub: 'señales §05', note: '' },
    { key: 'sales', label: 'Enviados a ventas', value: sales, dot: 'pink', sub: 'transferidos a comercial', note: '' },
    { key: 'won', label: 'Cerradas', value: won, dot: 'green', sub: 'producción y entrega', note: '' },
  ]

  // ── Sección 3 · De dónde vienen los leads — por ORIGEN (campaña) y por PAÍS ──
  const origenMap = {}
  const paisMap = {}
  for (const c of cards) {
    const campKey = (c.campana || '').toString()
    const label = ORIGEN_LABEL[campKey] || (c.canal || 'Directo')
    ;(origenMap[label] ||= { leads: 0, tierSum: 0, tierN: 0, tone: ORIGEN_TONE[campKey] || CANAL_TONE[(c.canal || '').toLowerCase()] || 'golddim' })
    origenMap[label].leads++
    if (c.tier && TIER_VAL[c.tier]) {
      origenMap[label].tierSum += TIER_VAL[c.tier]
      origenMap[label].tierN++
    }
    const pais = c.pais || '—'
    paisMap[pais] = (paisMap[pais] || 0) + 1
  }
  const channels = Object.entries(origenMap)
    .map(([name, v]) => {
      const avg = v.tierN ? v.tierSum / v.tierN : 0
      const quality = avg >= 3.5 ? 'alta' : avg >= 2.5 ? 'media' : 'baja'
      const pct = Math.round((v.leads / (total || 1)) * 100)
      return { name, leads: v.leads, quality, pct, tone: v.tone }
    })
    .sort((a, b) => b.leads - a.leads)
  const paises = Object.entries(paisMap).sort((a, b) => b[1] - a[1])

  // ── Sección 4 · Conversión comercial (handoff) ──
  const ganadas = won
  const enProceso = cards.filter((c) => numStage(c) >= 5 && numStage(c) < 10).length
  const perdidas = cards.filter((c) => c.stage === 'reactivacion').length
  const handoffTotal = ganadas + enProceso + perdidas
  const segments = [
    { label: 'Ganadas', value: ganadas, tone: 'green' },
    { label: 'Abiertas / en proceso', value: enProceso, tone: 'gold' },
    { label: 'Perdidas / reactivación', value: perdidas, tone: 'red' },
  ]
  const lossMap = {}
  for (const c of cards.filter((c) => c.stage === 'reactivacion')) {
    const r = LOSS_REASON[norm(c.estatusMkt)] || 'Sin seguimiento'
    lossMap[r] = (lossMap[r] || 0) + 1
  }
  const lossReasons = Object.entries(lossMap).map(([reason, value]) => ({ reason, value })).sort((a, b) => b.value - a.value)

  // ── Sección 5 · Tendencias (leads por semana según fecha) ──
  const weekMap = {}
  for (const c of cards) {
    if (!c.fecha) continue
    const d = new Date(c.fecha.replace(' ', 'T'))
    if (isNaN(d)) continue
    // etiqueta ISO por año-semana aproximada
    const onejan = new Date(d.getFullYear(), 0, 1)
    const wk = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7)
    const key = `s${wk}`
    weekMap[key] = (weekMap[key] || 0) + 1
  }
  const weekLabels = Object.keys(weekMap).sort()
  const trend = { weekLabels, data: weekLabels.map((k) => weekMap[k]) }

  return { funnel, channels, paises, handoff: { total: handoffTotal, segments, lossReasons }, trend }
}

const ENDPOINT = '/api/nocodb'

// Clave de acceso del dashboard (deny-by-default del proxy). Se guarda local y
// se manda en cada llamada como header x-app-key. Vacía = endpoint abierto.
const APP_KEY_STORE = 'circulo.appkey'
export const getAppKey = () => { try { return localStorage.getItem(APP_KEY_STORE) || '' } catch { return '' } }
export const setAppKey = (k) => { try { localStorage.setItem(APP_KEY_STORE, (k || '').trim()) } catch {} }
const apiHeaders = (extra) => {
  const k = getAppKey()
  return { accept: 'application/json', ...(k ? { 'x-app-key': k } : {}), ...(extra || {}) }
}

async function getResource(resource) {
  const res = await fetch(`${ENDPOINT}?resource=${resource}`, { headers: apiHeaders() })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    // Respuesta no-JSON: normalmente el endpoint /api/nocodb no está desplegado
    // (deploy sin la serverless function). Mensaje claro para diagnóstico.
    throw new Error(
      res.ok
        ? 'La API /api/nocodb no está disponible en este deploy (¿falta desplegar la función serverless?).'
        : `HTTP ${res.status} en /api/nocodb`,
    )
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// Actualiza un lead en NocoDB (edición/movimiento compartido en el dashboard).
// `ncId` es el Id interno de NocoDB (card.ncId). `fields` = columnas de Leads.
export async function patchLead(ncId, fields) {
  if (ncId == null) throw new Error('Este lead aún no existe en NocoDB (sin Id).')
  const res = await fetch(`${ENDPOINT}?resource=leads`, {
    method: 'PATCH',
    headers: apiHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ Id: ncId, ...fields }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// Traduce un patch de tarjeta (campos del dashboard) a columnas de NocoDB.
export function cardPatchToNoco(patch) {
  const f = {}
  if ('stage' in patch) f.etapa = etapaDeStage(patch.stage)
  if ('name' in patch) f.nombre = patch.name
  if ('ciudad' in patch) f.ciudad = patch.ciudad
  if ('volumen' in patch) f.botellas = patch.volumen ?? ''
  if ('proposito' in patch) f['propósito'] = patch.proposito
  if ('linea' in patch) f.linea = patch.linea
  if ('estatusMkt' in patch) f.estatus = patch.estatusMkt
  return f
}

// Lee la CONVERSACIÓN de una prueba desde NocoDB (tabla Mensajes), para que sea
// compartida entre navegadores (no depende del localStorage de cada quien).
export async function fetchConversacion(leadId) {
  const data = await getResource('signals').catch(() => ({ list: [] }))
  const rows = (data.list || []).filter((m) => (m.lead_id || '').toString().trim() === leadId)
  return rows
    .sort((a, b) => ((a.ts || '').toString() < (b.ts || '').toString() ? -1 : 1))
    .map((m) => {
      const emisor = (m.emisor || m.actor || '').toString().toLowerCase()
      const who = /agent|bot|sistema/.test(emisor) ? 'agent' : 'user'
      const ts = (m.ts || '').toString()
      const t = ts.includes(' ') ? (ts.split(' ')[1] || '').slice(0, 5) : ts.slice(11, 16)
      return { who, text: (m.texto || m['valor/detalle'] || '').toString(), t: t || '' }
    })
    .filter((m) => m.text)
}

// Lista de sesiones de prueba que existen en NocoDB (leads mc_<tel> de prueba),
// para que las pruebas de Kenia aparezcan en el simulador de Libia y viceversa.
export async function fetchSesionesPrueba() {
  const data = await getResource('leads').catch(() => ({ list: [] }))
  return (data.list || [])
    .map((r) => ({ id: (r.lead_id || '').toString().trim(), nombre: (r.nombre || '').toString().trim() }))
    .filter((r) => /^mc_/i.test(r.id) && esLeadDePrueba(r.id))
    .map((r) => ({ phone: r.id.replace(/^mc_/i, ''), label: r.nombre || 'Prueba' }))
}

// Lee las notas de un lead/prueba (por lead_id) desde NocoDB — compartidas.
export async function fetchNotas(leadId) {
  const data = await getResource('notas').catch(() => ({ list: [] }))
  const all = data.list || []
  const rows = leadId ? all.filter((n) => (n.lead_id || '').toString().trim() === leadId) : all
  return rows
    .map((n) => ({ autor: (n.autor || 'anónimo').toString(), texto: (n.texto || '').toString(), ts: (n.ts || '').toString() }))
    .sort((a, b) => (a.ts < b.ts ? -1 : 1))
}

// Guarda una nota de prueba en NocoDB (tabla Notas) — compartida entre todos.
export async function postNota({ leadId, autor, texto }) {
  const res = await fetch(`${ENDPOINT}?resource=notas`, {
    method: 'POST',
    headers: apiHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ lead_id: leadId, autor, texto }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// Hook principal: leads + señales unidos, con polling (tiempo real).
export function useLiveLeads({ pollMs = 30000 } = {}) {
  const [leads, setLeads] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const [leadsData, signalsData, notasData] = await Promise.all([
        getResource('leads'),
        getResource('signals').catch(() => ({ list: [] })),
        getResource('notas').catch(() => ({ list: [] })),
      ])
      if (!alive.current) return
      const cards = (leadsData.list || []).filter(isRealLead).map(mapLeadRowToCard)
      const withSignals = attachSignals(cards, signalsData.list || [])
      const enriched = attachNotas(withSignals, notasData.list || [])
      setLeads(enriched)
      setError('')
      setLastUpdated(leadsData.fetchedAt || new Date().toISOString())
    } catch (e) {
      if (!alive.current) return
      setError(String(e.message || e))
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    refresh()
    if (!pollMs) return () => { alive.current = false }
    const id = setInterval(refresh, pollMs)
    return () => {
      alive.current = false
      clearInterval(id)
    }
  }, [refresh, pollMs])

  return { leads, loading, error, lastUpdated, refresh }
}
