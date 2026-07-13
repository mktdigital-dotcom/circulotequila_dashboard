import { useEffect, useMemo, useRef, useState } from 'react'
import { brand, nav, agent } from './data/circulo.js'
import { useLiveLeads, setAppKey } from './data/live.js'
import Embudo from './sections/Embudo.jsx'
import Leads from './sections/Leads.jsx'
import Tendencias from './sections/Tendencias.jsx'
import Agente from './sections/Agente.jsx'

const STORAGE_KEY = 'circulo.board.v4'

// El Pipeline se alimenta SOLO de NocoDB (leads reales + de prueba) y de la vista
// previa del simulador. Sin tarjetas demo: lo que se ve es lo que está guardado.
function buildInitial() {
  return []
}

function loadBoard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return buildInitial()
}

// Fusiona los leads en vivo de NocoDB con el tablero actual: NocoDB es la fuente
// de verdad (etapa, tier, datos), pero conservamos las notas escritas localmente
// y los leads de prueba generados por el simulador (que no viven en NocoDB).
function mergeLive(liveCards, prevBoard) {
  const prevById = new Map((prevBoard || []).map((c) => [c.id, c]))
  const liveIds = new Set(liveCards.map((c) => c.id))
  const pruebas = (prevBoard || []).filter((c) => c.esPrueba && !liveIds.has(c.id))
  const merged = liveCards.map((c) => {
    const prev = prevById.get(c.id)
    if (!prev) return c
    return { ...c, notes: prev.notes?.length ? prev.notes : c.notes }
  })
  return [...pruebas, ...merged]
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
  const [section, setSection] = useState('embudo')
  const [period, setPeriod] = useState('mes')
  const [query, setQuery] = useState('')
  const [board, setBoard] = useState(loadBoard)
  const [keyInput, setKeyInput] = useState('')
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

  // Alta/actualización de un lead (lo usa el simulador para meter leads de prueba
  // al Pipeline, y para mantenerlos vivos conforme avanza la conversación).
  const upsertLead = (lead) => {
    setBoard((prev) => {
      const i = prev.findIndex((c) => c.id === lead.id)
      if (i === -1) return [lead, ...prev]
      const next = prev.slice()
      next[i] = { ...next[i], ...lead }
      return next
    })
  }

  const addLead = () => {
    const n = board.filter((c) => c.stage === 1).length + 1
    setBoard((prev) => [
      { id: 'L-' + Date.now().toString().slice(-5), stage: 1, name: `Prospecto nuevo ${n}`, ciudad: 'wa.api', bot: '— bot', ocasion: 'sin calificar', value: 0, tags: [], notes: [], linea: 'empresarial', stakeholders: [], events: [{ t: 'ahora', e: 'Lead capturado manualmente' }] },
      ...prev,
    ])
    setSection('leads')
  }

  const livePill = liveError ? 'NocoDB · sin conexión' : liveLoading && !liveLeads ? 'conectando…' : 'datos en vivo · NocoDB'
  const topbar = useMemo(
    () => ({
      embudo: { ph: 'Buscar en el resumen…', pill: livePill, btn: 'Exportar', arrow: true, action: () => exportCSV(board) },
      leads: { ph: 'Buscar lead, región u ocasión…', pill: livePill, btn: '+ Nuevo lead', arrow: false, action: addLead },
      tendencias: { ph: 'Buscar en tendencias…', pill: livePill, btn: 'Exportar', arrow: true, action: () => exportCSV(board) },
      agente: { ph: 'Probar un mensaje contra el SOP…', pill: 'agente · en línea', btn: 'Cargar SOP', arrow: true, action: () => window.open(agent.materials, '_blank', 'noopener') },
    }),
    [board, livePill],
  )
  const tb = topbar[section] || topbar.embudo

  const live = { leads: liveLeads, loading: liveLoading, error: liveError, lastUpdated }

  const sections = {
    embudo: <Embudo live={live} board={board} query={query} period={period} />,
    leads: <Leads board={board} setBoard={setBoard} query={query} />,
    tendencias: <Tendencias live={live} />,
    agente: <Agente onLead={upsertLead} goToPipeline={() => setSection('leads')} />,
  }

  // Candado del dashboard: solo aparece si el proxy responde 401 (o sea, cuando
  // el dueño configuró DASHBOARD_TOKEN en Vercel). Antes de eso, invisible.
  if (liveError === 'UNAUTHORIZED') {
    const entrar = () => { setAppKey(keyInput); window.location.reload() }
    return (
      <div className="authgate">
        <div className="authgate__box">
          <div className="authgate__brand">
            <div className="brand__edition">{brand.edition}</div>
            <div className="brand__name">
              {brand.name}
              <span className="reg">®</span>
            </div>
            <div className="brand__sub">{brand.sub}</div>
          </div>
          <div className="authgate__hr" />
          <div className="authgate__title">Panel comercial · acceso privado</div>
          <p className="authgate__sub">Ingresa tu clave para entrar.</p>
          <input
            className="authgate__input"
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && entrar()}
            placeholder="Clave de acceso"
            autoFocus
          />
          <button className="authgate__btn" onClick={entrar}>Entrar</button>
          <div className="authgate__foot">Acceso del equipo · Círculo Tequila</div>
        </div>
      </div>
    )
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
              <span className="nav__label">{item.label}</span>
              {item.live && (
                <span
                  className="nav__live"
                  title={liveError ? 'Sin conexión a NocoDB' : liveLeads ? 'Conectado a NocoDB' : 'Conectando…'}
                  style={{ background: liveError ? 'var(--red)' : liveLeads ? 'var(--green)' : 'var(--gold-dim)' }}
                />
              )}
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
