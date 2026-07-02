import { useState } from 'react'
import { stages, reactivationStage } from '../data/circulo.js'

const stageLabel = (s) =>
  s === 'reactivacion' ? reactivationStage.label : stages.find((x) => x.n === s)?.label || '—'

const peso = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0)

export default function Seguimientos({ query = '', board = [] }) {
  const [copied, setCopied] = useState(null)

  // Cola de seguimiento: reactivación (etapa "perdido") o sin movimiento ≥ 3 días,
  // lo más frío primero. Se alimenta de los leads reales de NocoDB.
  const baseQueue = board
    .filter((l) => l.stage === 'reactivacion' || (typeof l.dias === 'number' && l.dias >= 3))
    .sort((a, b) => (b.dias || 0) - (a.dias || 0))

  const q = query.trim().toLowerCase()
  const queue = !q
    ? baseQueue
    : baseQueue.filter((l) =>
        [l.name, l.empresa, l.ciudad, l.canal, l.estatusMkt].join(' ').toLowerCase().includes(q),
      )

  const copy = (l) => {
    const first = (l.name || 'Hola').split(' ')[0]
    const msg = `Hola ${first} 👋, retomando tu interés en las Ediciones Empresariales de Círculo${
      l.empresa && l.empresa !== l.name ? ' para ' + l.empresa : ''
    }. ${l.proximo}`
    navigator.clipboard?.writeText(msg)
    setCopied(l.id)
    setTimeout(() => setCopied((c) => (c === l.id ? null : c)), 1800)
  }

  const valorEnRiesgo = queue.reduce((s, l) => s + (l.valor || 0), 0)

  return (
    <section>
      <div className="section-head">
        <div>
          <div className="eyebrow">Seguimientos</div>
          <h1 className="headline">
            Nada se <span className="gold">enfría.</span>
          </h1>
          <p className="subhead">
            La cola que evita que una conversación con interés real se enfríe — reactivaciones y leads
            sin movimiento, del más frío al más reciente, con el estatus real y el próximo toque listo.
          </p>
        </div>
      </div>

      <div className="callout" style={{ marginBottom: 24 }}>
        <b>{queue.length} prospectos</b> esperan un toque · valor estimado en riesgo{' '}
        <b>{peso(valorEnRiesgo)}</b>
      </div>

      {queue.length === 0 && (
        <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
          Sin leads pendientes de seguimiento por ahora. Se llenará en cuanto haya prospectos sin
          movimiento o en reactivación.
        </div>
      )}

      <div className="stack">
        {queue.map((l) => (
          <div className="card" key={l.id} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 220 }}>
                <div className="lead-name" style={{ fontSize: 15 }}>
                  {l.name} <span className="lead-id">· {l.id}</span>
                </div>
                <div className="lead-emp">
                  {l.empresa && l.empresa !== l.name ? l.empresa + ' · ' : ''}
                  {l.ciudad}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <span className={'chip chip--stage' + (l.stage === 'reactivacion' ? ' chip--react' : ' chip--idle')}>
                    {l.stage === 'reactivacion' ? 'Reactivación' : `E${l.stage} · ${stageLabel(l.stage)}`}
                  </span>
                  {l.tier && <span className="chip">tier {l.tier}</span>}
                  {l.canal && <span className="chip">{l.canal}</span>}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="loss__title">Estatus · próximo toque</div>
                {l.estatusMkt && (
                  <div className="lead-resp" style={{ marginBottom: 6 }}>
                    Estatus MKT: <b style={{ color: 'var(--ink-soft)' }}>{l.estatusMkt}</b>
                  </div>
                )}
                <div className={'lead-next' + (l.proximo?.startsWith('⚠') ? ' warn' : '')} style={{ maxWidth: 'none', fontSize: 13.5 }}>
                  {l.proximo}
                </div>
                <div className="lead-resp" style={{ marginTop: 8 }}>
                  Responsable: {l.responsable} · última interacción {l.ultima}
                </div>
              </div>

              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div className={'days' + ((l.dias || 0) >= 7 ? ' hot' : '')} style={{ fontSize: 26, fontWeight: 600 }}>
                  {l.dias != null ? l.dias + 'd' : '—'}
                </div>
                <div className="lead-resp" style={{ fontSize: 10.5, marginBottom: 12 }}>sin movimiento</div>
                <button className="btn-export" style={{ height: 34, fontSize: 12 }} onClick={() => copy(l)}>
                  {copied === l.id ? '✓ copiado' : 'Copiar mensaje'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
