import { useState } from 'react'
import { leads, stages, reactivationStage, agent } from '../data/circulo.js'

const stageLabel = (s) =>
  s === 'reactivacion' ? reactivationStage.label : stages.find((x) => x.n === s)?.label || '—'

// Cola de seguimiento: reactivación o sin movimiento ≥ 3 días, lo más frío primero.
const baseQueue = leads
  .filter((l) => l.stage === 'reactivacion' || (typeof l.dias === 'number' && l.dias >= 3))
  .sort((a, b) => b.dias - a.dias)

const reactScript = agent.scripts.find((s) => s.n === 6)

export default function Seguimientos({ query = '' }) {
  const [copied, setCopied] = useState(null)
  const q = query.trim().toLowerCase()
  const queue = !q
    ? baseQueue
    : baseQueue.filter((l) => [l.nombre, l.empresa, l.ciudad, l.canal].join(' ').toLowerCase().includes(q))

  const copy = (l) => {
    const msg = `Hola ${l.nombre.split(' ')[0]} 👋, retomando tu interés en las Ediciones Empresariales de Círculo para ${l.empresa}. ${reactScript.body.split('\n')[0]}`
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
            La cola que evita que una conversación con interés real se enfríe. Estimas que ~60% de los
            leads que no avanzan son recuperables — aquí están, del más frío al más reciente, con el
            próximo toque listo.
          </p>
        </div>
      </div>

      <div className="callout" style={{ marginBottom: 24 }}>
        <b>{queue.length} prospectos</b> esperan un toque · <b>≈60%</b> de los que no avanzan podrían
        recuperarse · valor en riesgo aproximado{' '}
        <b>
          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(
            valorEnRiesgo,
          )}
        </b>
      </div>

      <div className="stack">
        {queue.map((l) => (
          <div className="card" key={l.id} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 220 }}>
                <div className="lead-name" style={{ fontSize: 15 }}>
                  {l.nombre} <span className="lead-id">· {l.id}</span>
                </div>
                <div className="lead-emp">{l.empresa} · {l.ciudad}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <span className={'chip chip--stage' + (l.stage === 'reactivacion' ? ' chip--react' : ' chip--idle')}>
                    {l.stage === 'reactivacion' ? 'Reactivación' : `E${l.stage} · ${stageLabel(l.stage)}`}
                  </span>
                  <span className="chip">{l.canal}</span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="loss__title">Próximo toque</div>
                <div className={'lead-next' + (l.proximo.startsWith('⚠') ? ' warn' : '')} style={{ maxWidth: 'none', fontSize: 13.5 }}>
                  {l.proximo}
                </div>
                <div className="lead-resp" style={{ marginTop: 8 }}>
                  Responsable: {l.responsable} · última interacción {l.ultima}
                </div>
              </div>

              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div className={'days' + (l.dias >= 7 ? ' hot' : '')} style={{ fontSize: 26, fontWeight: 600 }}>
                  {l.dias}d
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
