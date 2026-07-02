import {
  periods,
  leakIndex,
  channels,
  channelsCaption,
  handoff,
  lossReasons,
  trends,
  peso,
} from '../data/circulo.js'
import { leadsKpis } from '../data/live.js'
import { TrendLine } from '../components/Charts.jsx'

const TIER_COLOR = { A: 'var(--green)', B: 'var(--gold)', C: 'var(--blue)', D: 'var(--red)' }

// Tira de KPIs en vivo desde NocoDB — se actualiza sola (polling).
function LiveKpis({ live }) {
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
            ? 'Sin conexión a la base — revisa NOCODB_TOKEN en Vercel'
            : ready
              ? `${k.total} leads reales${rel ? ' · actualizado ' + rel : ''}`
              : 'Conectando con la base de datos…'}
        </span>
      </div>

      {ready && (
        <div className="lk-grid">
          <div className="lk-tile">
            <div className="lk-num">{k.total}</div>
            <div className="lk-lbl">leads totales</div>
          </div>
          <div className="lk-tile">
            <div className="lk-num" style={{ color: 'var(--green)' }}>{k.calientes}</div>
            <div className="lk-lbl">calientes · tier A</div>
          </div>
          <div className="lk-tile">
            <div className="lk-num">{k.scorePromedio ?? '—'}</div>
            <div className="lk-lbl">score promedio</div>
          </div>
          <div className="lk-tile lk-tile--tiers">
            <div className="lk-lbl" style={{ marginBottom: 8 }}>por tier</div>
            <div className="lk-tiers">
              {['A', 'B', 'C', 'D'].map((t) => (
                <span key={t} className="lk-tier">
                  <b style={{ color: TIER_COLOR[t] }}>{k.byTier[t]}</b>
                  <span>{t}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="lk-tile lk-tile--wide">
            <div className="lk-lbl" style={{ marginBottom: 8 }}>ciudades top</div>
            <div className="lk-chips">
              {k.topCiudades.length === 0 && <span className="muted" style={{ fontSize: 12 }}>—</span>}
              {k.topCiudades.map(([c, n]) => (
                <span key={c} className="lk-chip">{c} <b>{n}</b></span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Funnel({ stages }) {
  return (
    <div className="funnel">
      {stages.map((s, i) => {
        const conv = i > 0 ? Math.round((s.value / stages[i - 1].value) * 100) : null
        const prevLeak = i - 1 === leakIndex
        return (
          <div className="fstage" key={s.key}>
            {i > 0 && (
              <div className={'fconv' + (prevLeak ? ' leak' : '')}>
                <b>{isFinite(conv) ? conv : 0}%</b>
                {prevLeak ? <span className="leak-tag">fuga</span> : <span className="fconv__arrow">→</span>}
              </div>
            )}
            <div className="fstage__label">
              <span className={'fdot ' + s.dot} />
              {s.label}
            </div>
            <div className="fstage__value">{s.value}</div>
            <div className="fstage__sub">{s.sub}</div>
            <div className={'fstage__note' + (s.note?.startsWith('+') ? ' pos' : '')}>{s.note}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function Panel({ period, setPeriod, live }) {
  const p = periods[period]

  return (
    <section>
      <div className="section-head">
        <div>
          <div className="eyebrow">Panel · lunes 8:00 a.m.</div>
          <h1 className="headline">
            Una sola <span className="gold">verdad.</span>
            <br />
            De marketing a ventas.
          </h1>
          <p className="subhead">
            De dónde vienen, en qué etapa están, qué se transfirió a comercial y qué cerró — sin
            perseguir hojas de cálculo.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="updated">
            actualizado
            <b>hace 4 min</b>
          </div>
          <div className="toggle">
            {['hoy', 'semana', 'mes'].map((k) => (
              <button key={k} className={period === k ? 'is-active' : ''} onClick={() => setPeriod(k)}>
                {periods[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stack">
        {/* KPIs en vivo desde NocoDB */}
        <LiveKpis live={live} />

        {/* PREGUNTA 1 — embudo */}
        <div className="card card--pad-lg">
          <div className="card__head">
            <span className="card__tag">Pregunta 1</span>
            <span className="card__q">Cuántos generamos, cuántos calificaron, cuántos llegaron a ventas</span>
          </div>
          <Funnel stages={p.stages} />
        </div>

        {/* PREGUNTA 3 · 2 · tendencias */}
        <div className="grid grid--3">
          {/* Canales */}
          <div className="card">
            <div className="card__head">
              <span className="card__tag">Pregunta 3</span>
              <span className="card__q">Qué canales generan clientes</span>
            </div>
            <div className="bars">
              {channels.map((c) => (
                <div key={c.name}>
                  <div className="bar__top">
                    <div>
                      <div className="bar__name">
                        <span className={'dot-mini bg-' + c.tone} />
                        {c.name}
                      </div>
                      <div className="bar__meta">
                        {c.leads} leads · calidad {c.quality}
                      </div>
                    </div>
                    <div className={'bar__pct tone-' + c.tone}>{c.pct}%</div>
                  </div>
                  <div className="bar__track">
                    <div className={'bar__fill fill-' + c.tone} style={{ width: c.pct * 2.6 + '%' }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="bar__meta" style={{ marginTop: 18, marginLeft: 0, lineHeight: 1.5 }}>
              {channelsCaption}
            </p>
          </div>

          {/* Handoff */}
          <div className="card">
            <div className="card__head">
              <span className="card__tag">Pregunta 2</span>
              <span className="card__q">Qué pasó tras el handoff</span>
            </div>
            <div className="handoff__big">
              <span className="handoff__num">{handoff.total}</span>
              <span className="handoff__cap">
                oportunidades
                <br />
                enviadas a ventas
              </span>
            </div>
            <div className="stackbar">
              {handoff.segments.map((s) => (
                <span
                  key={s.label}
                  className={'bg-' + s.tone}
                  style={{ width: (s.value / handoff.total) * 100 + '%' }}
                />
              ))}
            </div>
            <div className="legend">
              {handoff.segments.map((s) => (
                <div className="legend__row" key={s.label}>
                  <span className="l">
                    <span className={'dot-mini bg-' + s.tone} />
                    {s.label}
                  </span>
                  <b>{s.value}</b>
                </div>
              ))}
            </div>
            <div className="loss">
              <div className="loss__title">Motivos de pérdida · 90 días</div>
              {lossReasons.slice(0, 3).map((r) => (
                <div className="loss__row" key={r.reason}>
                  <span>{r.reason}</span>
                  <span>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tendencias */}
          <div className="card trendcard">
            <div className="card__head">
              <span className="card__title">§ tendencias · 6 semanas</span>
            </div>
            <TrendLine data={trends.series.leads.data} color="#e6b35a" />
            <div className="trend-x">
              {trends.weekLabels.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="trend-foot">
              {trends.highlights.map((h) => (
                <div className="trend-foot__row" key={h.label}>
                  <span>{h.label}</span>
                  <span className={'delta ' + h.dir}>
                    <span className="tri">▲</span>
                    {h.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="muted" style={{ fontSize: 11.5, textAlign: 'right' }}>
          tiempo de cierre prom. <b style={{ color: 'var(--ink-soft)' }}>{handoff.closeDays} días</b> ·{' '}
          {handoff.closeNote} · ventas del periodo {peso(p.revenue)}
        </p>
      </div>
    </section>
  )
}
