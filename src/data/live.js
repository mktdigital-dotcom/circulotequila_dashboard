// ─────────────────────────────────────────────────────────────────────────────
// live.js · Capa de datos en vivo desde NocoDB (vía /api/nocodb de Vercel).
//
// - useLiveLeads(): trae los leads reales, con polling (tiempo real) + refresh.
// - mapLeadRowToCard(): traduce una fila de NocoDB al formato de tarjeta que ya
//   usan las secciones Leads y Panel.
// - leadsKpis(): calcula KPIs (por tier, etapa, canal, ciudad, score) para el Panel.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react'

// etapa (texto en NocoDB) → número de etapa (1–10) del pipeline del dashboard.
const ETAPA_TO_STAGE = {
  nuevo: 1,
  conversacion: 2,
  'en conversacion': 2,
  calificado: 3,
  interesado: 4,
  transferido: 5,
  'transferido a vendedor': 5,
  propuesta: 6,
  'propuesta aprobada': 6,
  anticipo: 7,
  brief: 8,
  diseno: 9,
  'diseno autorizado': 9,
  produccion: 10,
  entrega: 10,
  reactivacion: 'reactivacion',
}

const norm = (s) =>
  (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const PRECIO_750 = 2250 // estimación de valor por botella (línea empresarial 750 ml)

export function mapLeadRowToCard(row) {
  const botellas = parseInt(row.botellas, 10)
  const bot = Number.isFinite(botellas) ? botellas : null
  const etapaKey = norm(row.etapa)
  const stage = ETAPA_TO_STAGE[etapaKey] ?? 1
  const tier = (row.tier || '').toString().trim().toUpperCase() || null
  const score = row.score != null && row.score !== '' ? Number(row.score) : null

  const tags = []
  if (tier) tags.push('tier ' + tier)
  if (row.canal) tags.push(row.canal)
  if (row.linea) tags.push(row.linea)

  return {
    id: row.lead_id || ('nc-' + (row.Id ?? row.id ?? Math.random().toString(36).slice(2))),
    ncId: row.Id ?? row.id ?? null,
    stage,
    name: row.nombre || row.lead_id || 'Lead sin nombre',
    empresa: row.nombre || '',
    ciudad: row.ciudad || '—',
    bot: bot != null ? bot + ' bot' : '— bot',
    volumen: bot ?? undefined,
    ocasion: row['propósito'] || row.proposito || 'sin especificar',
    proposito: row['propósito'] || row.proposito || '',
    value: bot != null ? bot * PRECIO_750 : null, // estimado
    valueEstimated: bot != null,
    tier,
    score,
    canal: row.canal || '',
    linea: row.linea || '',
    campaña: row['campaña'] || row.campana || '',
    contacto: row.contacto || '',
    fecha: row.fecha || '',
    etapaTxt: row.etapa || '',
    estatus_mkt: row.estatus_mkt || '',
    owner: row.owner || '',
    tags,
    notes: [],
  }
}

// KPIs derivados de los leads reales para el Panel.
export function leadsKpis(cards) {
  const total = cards.length
  const byTier = { A: 0, B: 0, C: 0, D: 0 }
  const byCiudad = {}
  const byCanal = {}
  const byStage = {}
  let scoreSum = 0
  let scoreN = 0
  for (const c of cards) {
    if (c.tier && byTier[c.tier] != null) byTier[c.tier]++
    if (c.ciudad) byCiudad[c.ciudad] = (byCiudad[c.ciudad] || 0) + 1
    if (c.canal) byCanal[c.canal] = (byCanal[c.canal] || 0) + 1
    const st = c.stage
    byStage[st] = (byStage[st] || 0) + 1
    if (c.score != null && !Number.isNaN(c.score)) {
      scoreSum += c.score
      scoreN++
    }
  }
  const topCiudades = Object.entries(byCiudad).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topCanales = Object.entries(byCanal).sort((a, b) => b[1] - a[1]).slice(0, 5)
  return {
    total,
    byTier,
    byStage,
    topCiudades,
    topCanales,
    scorePromedio: scoreN ? Math.round(scoreSum / scoreN) : null,
    calientes: byTier.A,
  }
}

const ENDPOINT = '/api/nocodb'

// Hook de leads en vivo, con polling configurable (por defecto 30s).
export function useLiveLeads({ pollMs = 30000 } = {}) {
  const [leads, setLeads] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${ENDPOINT}?resource=leads`, { headers: { accept: 'application/json' } })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (!alive.current) return
      const cards = (data.list || []).map(mapLeadRowToCard)
      setLeads(cards)
      setError('')
      setLastUpdated(data.fetchedAt || new Date().toISOString())
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
