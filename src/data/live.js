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
const LEAD_ID_RE = /^L-?\d{1,6}$/i
export const isRealLead = (row) => LEAD_ID_RE.test((row?.lead_id || '').toString().trim())
// Señales reales: su lead_id apunta a un lead L-#### (filtra encabezado/notas).
export const isRealSignal = (row) => LEAD_ID_RE.test((row?.lead_id || '').toString().trim())

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
  const estatus = (row.estatus_mkt || '').toString().trim()
  const owner = (row.owner || '').toString().trim()

  const tags = []
  if (tier) tags.push('tier ' + tier)
  if (row.linea) tags.push(row.linea)
  if (stage === 'reactivacion') tags.push('reactivación')

  return {
    id: (row.lead_id || '').toString().trim(),
    ncId: row.Id ?? null,
    stage,
    name: row.nombre || row.lead_id || 'Lead sin nombre',
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
    anuncio: row.anuncio || '',
    contacto: row.contacto || '',
    fecha: row.fecha || '',
    etapaTxt: row.etapa || '',
    estatusMkt: estatus,
    contexto: row.contexto || '',
    requalifyAt: row.requalify_at || '',
    owner,
    // Derivados para Seguimientos / handoff:
    responsable: owner === 'agente' ? 'Agente IA' : (VENDEDOR_CIUDAD[ciudad] || owner || '—'),
    vendedor: stage >= 5 ? VENDEDOR_CIUDAD[ciudad] || '—' : null,
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
    return {
      ...c,
      events: evs,
      ultima: relLabel(lastTs) !== '—' ? relLabel(lastTs) : c.ultima,
      dias: daysSince(lastTs) ?? c.dias,
    }
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

  // ── Sección 3 · Rendimiento por canal ──
  const canalMap = {}
  for (const c of cards) {
    const key = (c.canal || 'otro').toString().toLowerCase()
    ;(canalMap[key] ||= { leads: 0, tierSum: 0, tierN: 0 })
    canalMap[key].leads++
    if (c.tier && TIER_VAL[c.tier]) {
      canalMap[key].tierSum += TIER_VAL[c.tier]
      canalMap[key].tierN++
    }
  }
  const channels = Object.entries(canalMap)
    .map(([key, v]) => {
      const avg = v.tierN ? v.tierSum / v.tierN : 0
      const quality = avg >= 3.5 ? 'alta' : avg >= 2.5 ? 'media' : 'baja'
      const pct = Math.round((v.leads / (total || 1)) * 100)
      return { name: CANAL_LABEL[key] || key, leads: v.leads, quality, pct, tone: CANAL_TONE[key] || 'blue' }
    })
    .sort((a, b) => b.leads - a.leads)

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

  return { funnel, channels, handoff: { total: handoffTotal, segments, lossReasons }, trend }
}

const ENDPOINT = '/api/nocodb'

async function getResource(resource) {
  const res = await fetch(`${ENDPOINT}?resource=${resource}`, { headers: { accept: 'application/json' } })
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

// Hook principal: leads + señales unidos, con polling (tiempo real).
export function useLiveLeads({ pollMs = 30000 } = {}) {
  const [leads, setLeads] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const [leadsData, signalsData] = await Promise.all([
        getResource('leads'),
        getResource('signals').catch(() => ({ list: [] })),
      ])
      if (!alive.current) return
      const cards = (leadsData.list || []).filter(isRealLead).map(mapLeadRowToCard)
      const enriched = attachSignals(cards, signalsData.list || [])
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
