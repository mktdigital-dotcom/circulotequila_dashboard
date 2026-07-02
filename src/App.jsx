import { useEffect, useMemo, useRef, useState } from 'react'
import { brand, nav, kanbanCards, leadContext, agent } from './data/circulo.js'
import { useLiveLeads } from './data/live.js'
import Panel from './sections/Panel.jsx'
import Leads from './sections/Leads.jsx'
import Agente from './sections/Agente.jsx'
import Seguimientos from './sections/Seguimientos.jsx'
import Arquitectura from './sections/Arquitectura.jsx'

const STORAGE_KEY = 'circulo.board.v3'

// Cada lead es la fuente de verdad: posición + contexto + notas, todo junto y
// persistido. Se siembra fusionando las tarjetas con su contexto que viaja.
function buildInitial() {
  return kanbanCards.map((c) => ({ ...(leadContext[c.id] || {}), ...c, notes: [] }))
}

function loadBoard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return buildInitial()
}

// Fusiona los leads en vivo de NocoDB con el tablero actual: NocoDB es la fuente
// de verdad (etapa, tier, datos), pero conservamos las notas que el usuario haya
// escrito localmente, indexadas por id de lead.
function mergeLive(liveCards, prevBoard) {
  const prevById = new Map((prevBoard || []).map((c) => [c.id, c]))
  return liveCards.map((c) => {
    const prev = prevById.get(c.id)
    if (!prev) return c
    return { ...c, notes: prev.notes?.length ? prev.notes : c.notes }
  })
}

function exportCSV(cards) {
  const cols = ['id', 'stage', 'name', 'ciudad', 'bot', 'ocasion', 'value']
  const head = cols.join(',')
  const rows = cards.map((c) =>
    cols
      .map((k) => {
        const v = c[k] == null ? '' : String(c[k]).replace(/"/g, '""')
        return /[",\n]/.test(v) ? `"${v}"` : v
      })
      .join(','),
  )
  const blob = new Blob(['﻿' + [head, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `circulo-pipeline-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [section, setSection] = useState('panel')
  const [period, setPeriod] = useState('mes')
  const [query, setQuery] = useState('')
  const [board, setBoard] = useState(loadBoard)
  const searchRef = useRef(null)

  // Datos en vivo desde NocoDB (vía /api/nocodb). Polling = tiempo real.
  const { leads: liveLeads, loading: liveLoading, error: liveError, lastUpdated } =
    useLiveLeads({ pollMs: 45000 })

  // Cuando llegan los leads reales, se vuelven la fuente del tablero.
  useEffect(() => {
    if (liveLeads && liveLeads.length) setBoard((prev) => mergeLive(liveLeads, prev))
  }, [liveLeads])

  // persistencia del pipeline
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
    } catch {}
  }, [board])

  // ⌘K / Ctrl+K · Esc
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // limpiar búsqueda al cambiar de sección
  useEffect(() => setQuery(''), [section])

  const addLead = () => {
    const n = board.filter((c) => c.stage === 1).length + 1
    setBoard((prev) => [
      { id: 'L-' + Date.now().toString().slice(-5), stage: 1, name: `Prospecto nuevo ${n}`, ciudad: 'wa.api', bot: '— bot', ocasion: 'sin calificar', value: 0, tags: [], notes: [], linea: 'empresarial', stakeholders: [], events: [{ t: 'ahora', e: 'Lead capturado manualmente' }] },
      ...prev,
    ])
    setSection('leads')
  }

  const topbar = useMemo(
    () => ({
      panel: { ph: 'Preguntar al sistema de Círculo…', pill: 'datos en vivo', btn: 'Exportar', arrow: true, action: () => exportCSV(board) },
      leads: { ph: 'Buscar lead, región u ocasión…', pill: 'sync: wa.api', btn: '+ Nuevo lead', arrow: false, action: addLead },
      agente: { ph: 'Probar un mensaje contra el SOP…', pill: 'modelo: en_vivo', btn: 'Cargar SOP', arrow: true, action: () => window.open(agent.materials, '_blank', 'noopener') },
      seguimientos: { ph: 'Buscar prospecto en seguimiento…', pill: 'datos en vivo', btn: 'Exportar', arrow: true, action: () => exportCSV(board) },
      arquitectura: { ph: 'Buscar en la arquitectura…', pill: 'azxion · v.2026.06', btn: 'Exportar', arrow: true, action: () => exportCSV(board) },
    }),
    [board],
  )
  const tb = topbar[section]

  const live = { leads: liveLeads, loading: liveLoading, error: liveError, lastUpdated }

  const sections = {
    panel: <Panel period={period} setPeriod={setPeriod} live={live} />,
    leads: <Leads board={board} setBoard={setBoard} query={query} />,
    agente: <Agente />,
    seguimientos: <Seguimientos query={query} board={board} />,
    arquitectura: <Arquitectura />,
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__edition">{brand.edition}</div>
          <div className="brand__name">
            {brand.name}
            <span className="reg">®</span>
          </div>
          <div className="brand__sub">{brand.sub}</div>
          <div className="brand__tag">{brand.tagline}</div>
        </div>

        <nav className="nav">
          {nav.map((item) => (
            <button
              key={item.key}
              className={'nav__item' + (section === item.key ? ' is-active' : '')}
              onClick={() => setSection(item.key)}
            >
              <span className="nav__num">{item.n}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__foot">
          <span className="foot-live" title={liveError || ''}>
            <span className="dot-live" style={liveError ? { background: 'var(--red)' } : undefined} />
            {liveError
              ? 'NocoDB · sin conexión'
              : liveLoading && !liveLeads
                ? 'conectando a NocoDB…'
                : `NocoDB · ${liveLeads?.length ?? 0} leads en vivo`}
          </span>
          <span className="foot-ref">
            {brand.ref} · {brand.geo}
          </span>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <label className="search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tb.ph}
            />
            <span className="search__kbd">⌘K</span>
          </label>

          <span className="pill-live">
            <span className="dot-live" />
            {tb.pill}
          </span>

          <button className="btn-export" onClick={tb.action} title={tb.btn}>
            {tb.btn}
            {tb.arrow && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        <div key={section} className="fade-in">
          {sections[section]}
        </div>
      </main>
    </div>
  )
}
