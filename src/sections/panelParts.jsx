// Piezas reutilizables del tablero, cada una alimentada por datos reales de
// NocoDB (con fallback a cifras de referencia). Se reparten en las secciones
// que pidió el negocio: Embudo, Canales, Conversión y Tendencias.
import { useState } from 'react'
import {
  periods,
  leakIndex,
  channels as channelsStatic,
  channelsCaption,
  handoff as handoffStatic,
  lossReasons as lossStatic,
  trends,
} from '../data/circulo.js'
import { leadsKpis, panelModel, clasificarObjeciones } from '../data/live.js'
import { TrendLine } from '../components/Charts.jsx'

const TIER_COLOR = { A: 'var(--green)', B: 'var(--gold)', C: 'var(--blue)', D: 'var(--red)' }
export const usePanel = (live) =>
  live?.leads && !live?.error && live.leads.length ? panelModel(live.leads) : null

// Encabezado de sección reutilizable.
export function Head({ eyebrow, title, gold, sub }) {
  return (
    <div className="section-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="headline">
          {title} {gold && <span className="gold">{gold}</span>}
        </h1>
        {sub && <p className="subhead">{sub}</p>}
      </div>
    </div>
  )
}

// Tira de KPIs en vivo desde NocoDB.
export function LiveKpis({ live }) {
  const cards = live?.leads || []
  const ready = !!live?.leads && !live?.error
  const k = leadsKpis(cards)
  const rel = live?.lastUpdated
    ? new Date(live.lastUpdated).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : null
  return (
    <div className="card card--pad-lg live-kpis">
      <div className="card__head">
        <span className="card__tag">
          <span className="dot-live" style={live?.error ? { background: 'var(--red)' } : undefined} /> En vivo · NocoDB
        </span>
        <span className="card__q">
          {live?.error
            ? `Sin conexión: ${live.error}`
            : ready
              ? `${k.total} leads reales${rel ? ' · actualizado ' + rel : ''}`
              : 'Conectando con la base de datos…'}
        </span>
      </div>
      {ready && (
        <div className="lk-grid">
          <div className="lk-tile"><div className="lk-num">{k.total}</div><div className="lk-lbl">leads totales</div></div>
          <div className="lk-tile"><div className="lk-num" style={{ color: 'var(--green)' }}>{k.calientes}</div><div className="lk-lbl">calientes · tier A</div></div>
          <div className="lk-tile"><div className="lk-num" style={{ color: 'var(--red)' }}>{k.reactivacion}</div><div className="lk-lbl">en reactivación</div></div>
          <div className="lk-tile"><div className="lk-num">{k.scorePromedio ?? '—'}</div><div className="lk-lbl">score promedio</div></div>
          <div className="lk-tile lk-tile--tiers">
            <div className="lk-lbl" style={{ marginBottom: 8 }}>por tier</div>
            <div className="lk-tiers">
              {['A', 'B', 'C', 'D'].map((t) => (
                <span key={t} className="lk-tier"><b style={{ color: TIER_COLOR[t] }}>{k.byTier[t]}</b><span>{t}</span></span>
              ))}
            </div>
          </div>
          <div className="lk-tile lk-tile--wide">
            <div className="lk-lbl" style={{ marginBottom: 8 }}>ciudades top</div>
            <div className="lk-chips">
              {k.topCiudades.length === 0 && <span className="muted" style={{ fontSize: 12 }}>—</span>}
              {k.topCiudades.map(([c, n]) => (<span key={c} className="lk-chip">{c} <b>{n}</b></span>))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Embudo (Pregunta 1).
export function Funnel({ stages, showLeak = true }) {
  return (
    <div className="funnel">
      {stages.map((s, i) => {
        const conv = i > 0 ? Math.round((s.value / (stages[i - 1].value || 1)) * 100) : null
        const prevLeak = showLeak && i - 1 === leakIndex
        return (
          <div className="fstage" key={s.key}>
            {i > 0 && (
              <div className={'fconv' + (prevLeak ? ' leak' : '')}>
                <b>{isFinite(conv) ? conv : 0}%</b>
                {prevLeak ? <span className="leak-tag">fuga</span> : <span className="fconv__arrow">→</span>}
              </div>
            )}
            <div className="fstage__label"><span className={'fdot ' + s.dot} />{s.label}</div>
            <div className="fstage__value">{s.value}</div>
            <div className="fstage__sub">{s.sub}</div>
            <div className={'fstage__note' + (s.note?.startsWith('+') ? ' pos' : '')}>{s.note}</div>
          </div>
        )
      })}
    </div>
  )
}

// De dónde vienen los leads — por origen/campaña y por país (Pregunta 3).
export function ChannelsCard({ live, period = 'mes' }) {
  const pm = usePanel(live)
  const chans = pm ? pm.channels : channelsStatic
  const paises = pm ? pm.paises : []
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__tag">Pregunta 3{pm ? ' · datos reales' : ' · ejemplo'}</span>
        <span className="card__q">De dónde vienen los leads</span>
      </div>
      <div className="bars__lbl">Por origen / campaña</div>
      <div className="bars">
        {chans.map((c) => (
          <div key={c.name}>
            <div className="bar__top">
              <div>
                <div className="bar__name"><span className={'dot-mini bg-' + c.tone} />{c.name}</div>
                <div className="bar__meta">{c.leads} leads · calidad {c.quality}</div>
              </div>
              <div className={'bar__pct tone-' + c.tone}>{c.pct}%</div>
            </div>
            <div className="bar__track"><div className={'bar__fill fill-' + c.tone} style={{ width: Math.min(100, c.pct * 2.6) + '%' }} /></div>
          </div>
        ))}
      </div>
      {pm && paises.length > 0 && (
        <>
          <div className="bars__lbl" style={{ marginTop: 18 }}>Por país</div>
          <div className="lk-chips">
            {paises.map(([pais, n]) => (
              <span key={pais} className="lk-chip">{pais} <b>{n}</b></span>
            ))}
          </div>
        </>
      )}
      <p className="bar__meta" style={{ marginTop: 18, marginLeft: 0, lineHeight: 1.5 }}>
        {pm ? 'Distribución real de leads por origen (campaña Meta / web) y por país, con calidad según tier.' : channelsCaption}
      </p>
    </div>
  )
}

// Conversión comercial / handoff (Pregunta 2).
export function HandoffCard({ live }) {
  const pm = usePanel(live)
  const ho = pm ? pm.handoff : handoffStatic
  const losses = pm ? pm.handoff.lossReasons : lossStatic
  const [clasificando, setClasificando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const clasificar = async () => {
    setClasificando(true)
    setResultado(null)
    try {
      const r = await clasificarObjeciones()
      setResultado(`Se clasificaron ${r.clasificados} leads.`)
      live?.refresh?.()
    } catch (e) {
      setResultado('Error: ' + e.message)
    } finally {
      setClasificando(false)
    }
  }
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__tag">Pregunta 2{pm ? ' · datos reales' : ' · ejemplo'}</span>
        <span className="card__q">Qué pasó tras el handoff</span>
      </div>
      <div className="handoff__big">
        <span className="handoff__num">{ho.total}</span>
        <span className="handoff__cap">oportunidades<br />enviadas a ventas</span>
      </div>
      <div className="stackbar">
        {ho.segments.map((s) => (
          <span key={s.label} className={'bg-' + s.tone} style={{ width: (s.value / (ho.total || 1)) * 100 + '%' }} />
        ))}
      </div>
      <div className="legend">
        {ho.segments.map((s) => (
          <div className="legend__row" key={s.label}>
            <span className="l"><span className={'dot-mini bg-' + s.tone} />{s.label}</span><b>{s.value}</b>
          </div>
        ))}
      </div>
      <div className="loss">
        <div className="loss__title">Motivos de pérdida{pm ? '' : ' · 90 días'}</div>
        {(losses.length ? losses : lossStatic).slice(0, 4).map((r) => (
          <div className="loss__row" key={r.reason}><span>{r.reason}</span><span>{r.value}</span></div>
        ))}
        {pm && losses.length === 0 && (
          <div className="loss__row"><span className="muted">Sin pérdidas registradas</span><span>0</span></div>
        )}
      </div>
      {pm && (ho.clasificacionPerdida.leadMalo + ho.clasificacionPerdida.handoffMalo + ho.clasificacionPerdida.sinClasificar > 0) && (
        <div className="loss">
          <div className="loss__title">Dónde se perdió (resultado #8)</div>
          <div className="loss__row"><span>Lead malo (antes del handoff)</span><span>{ho.clasificacionPerdida.leadMalo}</span></div>
          <div className="loss__row"><span>Handoff malo (ya con vendedor)</span><span>{ho.clasificacionPerdida.handoffMalo}</span></div>
          {ho.clasificacionPerdida.sinClasificar > 0 && (
            <div className="loss__row"><span className="muted">Sin clasificar (histórico)</span><span>{ho.clasificacionPerdida.sinClasificar}</span></div>
          )}
        </div>
      )}
      {pm && (
        <div className="loss">
          <button className="btn-export" onClick={clasificar} disabled={clasificando}>
            {clasificando ? 'Clasificando…' : 'Clasificar objeciones automáticamente'}
          </button>
          <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
            Lee las conversaciones y llena el motivo de los leads perdidos ANTES del handoff.
            Los perdidos después del handoff los sigue llenando Kenia a mano.
          </div>
          {resultado && <div className="loss__row"><span>{resultado}</span></div>}
        </div>
      )}
    </div>
  )
}

// Tendencias (Sección 5).
export function TrendsCard({ live }) {
  const pm = usePanel(live)
  const data = pm && pm.trend.data.length ? pm.trend.data : trends.series.leads.data
  const labels = pm && pm.trend.weekLabels.length ? pm.trend.weekLabels : trends.weekLabels
  return (
    <div className="card trendcard">
      <div className="card__head">
        <span className="card__title">§ tendencias · leads por semana{pm ? ' · reales' : ' · ejemplo'}</span>
      </div>
      <TrendLine data={data} color="#e6b35a" />
      <div className="trend-x">{labels.map((w) => (<span key={w}>{w}</span>))}</div>
      {!pm && (
        <div className="trend-foot">
          {trends.highlights.map((h) => (
            <div className="trend-foot__row" key={h.label}>
              <span>{h.label}</span>
              <span className={'delta ' + h.dir}><span className="tri">▲</span>{h.delta}</span>
            </div>
          ))}
        </div>
      )}
      {pm && (
        <p className="bar__meta" style={{ marginTop: 14, marginLeft: 0 }}>
          Evolución real de leads captados por semana. Los comparativos se enriquecen con más historial.
        </p>
      )}
    </div>
  )
}

export const funnelStagesFor = (live, period) => {
  const pm = usePanel(live)
  return pm ? { stages: pm.funnel, showLeak: false } : { stages: periods[period].stages, showLeak: true }
}
