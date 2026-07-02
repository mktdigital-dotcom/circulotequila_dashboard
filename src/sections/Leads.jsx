import { useRef, useState } from 'react'
import { stages, stageAccents, gateFields, arquitectura, pesoCompact } from '../data/circulo.js'

const stageLabel = (n) => stages.find((s) => s.n === n)?.label || '—'
const accentOf = (n) => stageAccents[n] || '#e9b65d'
const objLabel = (cat) => arquitectura.objeciones.find((o) => o.cat === cat)
const GATE_LABEL = { empresa: 'Empresa', volumen: 'Volumen', proposito: 'Propósito', ciudad: 'Ciudad', fechaObjetivo: 'Fecha objetivo' }

const marketing = stages.filter((s) => s.n <= 4)
const comercial = stages.filter((s) => s.n >= 5)

const stamp = () =>
  new Date().toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const In = ({ v, set, type = 'text', ph }) => (
  <input
    className="d-input"
    type={type}
    value={v ?? ''}
    placeholder={ph}
    onChange={(e) => set(type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value)}
  />
)
const Sel = ({ v, set, opts }) => (
  <select className="d-input" value={v ?? ''} onChange={(e) => set(e.target.value)}>
    {opts.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o || '—'}</option> : <option key={o.v} value={o.v}>{o.l}</option>))}
  </select>
)

function Field({ label, children }) {
  return (
    <div className="ctx-field">
      <span className="ctx-field__l">{label}</span>
      <span className="ctx-field__v">{children}</span>
    </div>
  )
}

function LeadDrawer({ card, onClose, onChange }) {
  const [editing, setEditing] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [note, setNote] = useState('')
  if (!card) return null
  const set = (patch) => onChange(patch)
  const accent = accentOf(card.stage)

  const checks = gateFields.map((f) => {
    if (f === 'volumen') return { f, ok: (card.volumen || 0) >= 12, val: card.volumen ? card.volumen + ' bot' : '—' }
    return { f, ok: !!card[f], val: card[f] || '—' }
  })
  const completeness = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100)
  const obj = card.objecion ? objLabel(card.objecion) : null
  const hasCtx = card.proposito || card.linea || (card.events && card.events.length)

  const addTag = () => {
    const t = tagInput.trim()
    if (!t) return
    set({ tags: [...(card.tags || []), t] })
    setTagInput('')
  }
  const addNote = () => {
    const t = note.trim()
    if (!t) return
    set({ notes: [{ t: stamp(), text: t }, ...(card.notes || [])] })
    setNote('')
  }

  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" style={{ '--accent': accent }} onClick={(e) => e.stopPropagation()}>
        <div className="drawer__head">
          {editing ? (
            <Sel v={card.stage} set={(v) => set({ stage: Number(v) })} opts={stages.map((s) => ({ v: s.n, l: `${s.n} · ${s.label}` }))} />
          ) : (
            <span className="chip chip--stage" style={{ color: accent, borderColor: accent + '55' }}>
              Etapa {card.stage} · {stageLabel(card.stage)}
            </span>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={'edit-btn' + (editing ? ' is-on' : '')} onClick={() => setEditing((e) => !e)}>
              {editing ? '✓ Listo' : 'Editar'}
            </button>
            <button className="drawer__close" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
        </div>

        {editing ? (
          <input className="d-input d-title" value={card.name} onChange={(e) => set({ name: e.target.value })} />
        ) : (
          <div className="drawer__title">{card.name}</div>
        )}
        <div className="drawer__sub">
          {card.empresa && card.empresa !== card.name ? card.empresa + ' · ' : ''}
          {card.ciudad} · <span className="lead-id">{card.id}</span>
        </div>
        <div className="drawer__value" style={{ color: accent }}>
          {editing ? (
            <span className="d-inline"><In v={card.value} set={(v) => set({ value: v })} type="number" /> MXN</span>
          ) : (
            <>{pesoCompact(card.value)} <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>· {card.bot} · {card.ocasion}</span></>
          )}
        </div>

        {/* tags */}
        <div className="kcard__tags" style={{ marginTop: 12 }}>
          {(card.tags || []).map((t) => (
            <span key={t} className={'ktag' + (t === 'reactivación' ? ' ktag--react' : '')}>
              {t}
              {editing && <button className="ktag__x" onClick={() => set({ tags: card.tags.filter((x) => x !== t) })}>×</button>}
            </span>
          ))}
          {editing && (
            <input
              className="ktag-add"
              value={tagInput}
              placeholder="+ etiqueta"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              onBlur={addTag}
            />
          )}
        </div>

        {(hasCtx || editing) && (
          <div className="drawer__section">
            <div className="drawer__label">Contexto que viaja</div>
            <div className="ctx-grid">
              <Field label="Línea de negocio">
                {editing ? <Sel v={card.linea} set={(v) => set({ linea: v })} opts={['empresarial', 'turismo', 'retail', 'digital']} /> : <span className="chip">{card.linea || '—'}</span>}
              </Field>
              <Field label="Propósito">{editing ? <In v={card.proposito} set={(v) => set({ proposito: v })} ph="propósito" /> : card.proposito || '—'}</Field>
              <Field label="Fecha objetivo">{editing ? <In v={card.fechaObjetivo} set={(v) => set({ fechaObjetivo: v })} ph="2026-12-05" /> : card.fechaObjetivo || '— por definir'}</Field>
              <Field label="Volumen">{editing ? <In v={card.volumen} set={(v) => set({ volumen: v })} type="number" ph="botellas" /> : (card.volumen ? card.volumen + ' bot' : '—')}</Field>
              <Field label="Presupuesto">
                {editing ? <Sel v={card.budget} set={(v) => set({ budget: v })} opts={['confirmado', 'estimado', 'desconocido']} /> : <span className={'tag-budget tag-' + (card.budget || 'desconocido')}>{card.budget || '—'}</span>}
              </Field>
              <Field label="Canal preferido">{editing ? <In v={card.canalPreferido} set={(v) => set({ canalPreferido: v })} /> : card.canalPreferido || '—'}</Field>
              <Field label="Afinidad">
                {editing ? <In v={card.icpFit} set={(v) => set({ icpFit: v })} type="number" ph="0–100" /> : (
                  <span className="icp"><span className="icp__bar"><i style={{ width: (card.icpFit || 0) + '%', background: accent }} /></span>{card.icpFit ?? '—'}</span>
                )}
              </Field>
              <Field label="Stakeholders">
                {editing ? <In v={(card.stakeholders || []).join(', ')} set={(v) => set({ stakeholders: v.split(',').map((s) => s.trim()).filter(Boolean) })} ph="compras, dirección" /> : ((card.stakeholders || []).length ? card.stakeholders.join(' · ') : '—')}
              </Field>
            </div>
          </div>
        )}

        <div className="drawer__section">
          <div className="drawer__label">Última promesa</div>
          <div className="promise">
            {editing ? <In v={card.ultimaPromesa} set={(v) => set({ ultimaPromesa: v })} ph="qué se prometió" /> : <span>{card.ultimaPromesa || 'Ninguna registrada'}</span>}
            {editing ? (
              <Sel v={card.promesaStatus} set={(v) => set({ promesaStatus: v })} opts={['pendiente', 'cumplida']} />
            ) : (
              card.promesaStatus && <span className={'chip ' + (card.promesaStatus === 'pendiente' ? 'chip--idle' : 'chip--ok')}>{card.promesaStatus}</span>
            )}
          </div>
          <div className="next-action">
            <span className="drawer__label" style={{ marginBottom: 6 }}>Próxima acción</span>
            {editing ? <In v={card.nextAction} set={(v) => set({ nextAction: v })} ph="siguiente paso" /> : (card.nextAction || '—')}
            {!editing && card.touches > 0 && <span className="touches">· {card.touches} toque(s) sin respuesta</span>}
          </div>
        </div>

        {(obj || editing) && (
          <div className="drawer__section">
            <div className="drawer__label">Objeción abierta</div>
            {editing ? (
              <Sel v={card.objecion || ''} set={(v) => set({ objecion: v || null })} opts={[{ v: '', l: '— ninguna' }, ...arquitectura.objeciones.map((o) => ({ v: o.cat, l: o.tipica }))]} />
            ) : obj ? (
              <div className="objection">
                <span className="chip chip--react">{obj.tipica}</span>
                <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 8 }}>{obj.marco}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* compuerta */}
        <div className="drawer__section">
          <div className="drawer__label">
            Compuerta · calificación
            <span className="gate-pct" style={{ color: completeness >= 80 ? 'var(--green)' : completeness >= 50 ? 'var(--gold)' : 'var(--red)' }}>{completeness}% completo</span>
          </div>
          <div className="gate-list">
            {checks.map((c) => (
              <div className="gate-item" key={c.f}>
                <span className={'gate-dot' + (c.ok ? ' ok' : '')}>{c.ok ? '✓' : '○'}</span>
                <span className="gate-name">{GATE_LABEL[c.f]}</span>
                <span className="gate-val">{String(c.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* notas */}
        <div className="drawer__section">
          <div className="drawer__label">Notas</div>
          <div className="note-add">
            <textarea
              className="d-textarea"
              value={note}
              placeholder="Escribe una nota del lead…"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addNote() } }}
            />
            <button className="btn-export" style={{ height: 34, fontSize: 12 }} onClick={addNote}>Agregar nota</button>
          </div>
          <div className="notes">
            {(card.notes || []).length === 0 && <div className="muted" style={{ fontSize: 12 }}>Sin notas todavía.</div>}
            {(card.notes || []).map((nt, i) => (
              <div className="note" key={i}>
                <div className="note__body">
                  <span className="note__t">{nt.t}</span>
                  <p>{nt.text}</p>
                </div>
                <button className="note__x" onClick={() => set({ notes: card.notes.filter((_, j) => j !== i) })} aria-label="Eliminar nota">×</button>
              </div>
            ))}
          </div>
        </div>

        {card.events?.length > 0 && (
          <div className="drawer__section">
            <div className="drawer__label">Línea de tiempo · eventos</div>
            <div className="timeline">
              {card.events.map((ev, i) => (
                <div className="tl-row" key={i}>
                  <span className="tl-dot" style={{ background: accent }} />
                  <span className="tl-e">{ev.e}</span>
                  <span className="tl-t">{ev.t}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

function Column({ stage, board, match, overStage, setOverStage, onDrop, onDragStartCard, onDragEndCard, onClickCard }) {
  const accent = accentOf(stage.n)
  const cards = board.filter((c) => c.stage === stage.n && match(c))
  const colTotal = board.filter((c) => c.stage === stage.n).reduce((s, c) => s + (c.value || 0), 0)
  return (
    <div
      className={'kcol' + (overStage === stage.n ? ' is-over' : '')}
      style={{ '--accent': accent }}
      onDragOver={(e) => { e.preventDefault(); if (overStage !== stage.n) setOverStage(stage.n) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setOverStage(null) }}
      onDrop={() => onDrop(stage.n)}
    >
      <div className="kcol__head">
        <span className="kcol__num" style={{ background: accent }}>{stage.n}</span>
        <span className="kcol__label">{stage.label}</span>
        <span className="kcount">{board.filter((c) => c.stage === stage.n).length}</span>
      </div>
      <div className="kcol__total">{colTotal ? pesoCompact(colTotal) : '—'}</div>
      <div className="kcol__body">
        {cards.map((c) => (
          <article
            key={c.id}
            className="kcard"
            draggable
            onDragStart={() => onDragStartCard(c.id)}
            onDragEnd={onDragEndCard}
            onClick={() => onClickCard(c.id)}
          >
            <div className="kcard__top">
              <span className="kcard__name">{c.name}</span>
              <span className="kcard__handle" aria-hidden>⋮⋮</span>
            </div>
            <div className="kcard__meta">{c.ciudad} · {c.bot} · {c.ocasion}</div>
            <div className="kcard__val" style={{ color: accent }}>{pesoCompact(c.value)}</div>
            {(c.tags?.length > 0 || c.notes?.length > 0) && (
              <div className="kcard__tags">
                {(c.tags || []).map((t) => (
                  <span key={t} className={'ktag' + (t === 'reactivación' ? ' ktag--react' : '')}>{t}</span>
                ))}
                {c.notes?.length > 0 && <span className="ktag ktag--note">✎ {c.notes.length}</span>}
              </div>
            )}
          </article>
        ))}
        <div className="kcol__drop">soltar aquí</div>
      </div>
    </div>
  )
}

export default function Leads({ board, setBoard, query = '' }) {
  const dragId = useRef(null)
  const draggedRef = useRef(false)
  const [overStage, setOverStage] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const selected = board.find((c) => c.id === selectedId) || null

  const q = query.trim().toLowerCase()
  const match = (c) => !q || [c.name, c.ciudad, c.ocasion, ...(c.tags || [])].join(' ').toLowerCase().includes(q)

  const pipeline = board.filter((c) => c.stage >= 3 && c.stage < 10).reduce((s, c) => s + (c.value || 0), 0)
  const entregado = board.filter((c) => c.stage === 10).reduce((s, c) => s + (c.value || 0), 0)

  const onDrop = (stageN) => {
    const id = dragId.current
    setOverStage(null)
    dragId.current = null
    if (!id) return
    setBoard((prev) => prev.map((c) => (c.id === id ? { ...c, stage: stageN } : c)))
  }
  const onClickCard = (id) => {
    if (draggedRef.current) { draggedRef.current = false; return }
    setSelectedId(id)
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <div className="eyebrow">Pipeline · mapa de proceso</div>
          <h1 className="headline">
            Pipeline <span className="gold">vivo.</span>
          </h1>
          <p className="subhead">
            Cada lead en su etapa — de marketing a comercial, con la compuerta en medio. Los leads del
            simulador entran aquí como prueba. Arrastra para mover de etapa; toca un lead para abrir,{' '}
            <b style={{ color: 'var(--ink)' }}>editar</b> y anotar su contexto.
          </p>
        </div>
        <div className="pipeline-badge">
          <span className="pipeline-badge__label">pipeline_calificado</span>
          <span className="pipeline-badge__value">{pesoCompact(pipeline)}</span>
          <span className="pipeline-badge__sub">entregado {pesoCompact(entregado)}</span>
        </div>
      </div>

      <div className="pipeline">
        <div className="pzones">
          <div className="pzone tone-teal" style={{ gridColumn: '1 / 5' }}>
            <span className="dot-mini bg-teal" /> Zona marketing
          </div>
          <div style={{ gridColumn: '5 / 6' }} />
          <div className="pzone tone-gold" style={{ gridColumn: '6 / 12' }}>
            <span className="dot-mini bg-gold" /> Zona comercial
          </div>
        </div>

        <div className="kanban">
          {marketing.map((s) => (
            <Column key={s.n} stage={s} board={board} match={match} overStage={overStage} setOverStage={setOverStage} onDrop={onDrop}
              onDragStartCard={(id) => { dragId.current = id; draggedRef.current = true }}
              onDragEndCard={() => { dragId.current = null; setOverStage(null) }}
              onClickCard={onClickCard} />
          ))}
          <div className="pgate" aria-hidden>
            <span className="pgate__line" />
            <span className="pgate__label">compuerta · pasa a ventas</span>
          </div>
          {comercial.map((s) => (
            <Column key={s.n} stage={s} board={board} match={match} overStage={overStage} setOverStage={setOverStage} onDrop={onDrop}
              onDragStartCard={(id) => { dragId.current = id; draggedRef.current = true }}
              onDragEndCard={() => { dragId.current = null; setOverStage(null) }}
              onClickCard={onClickCard} />
          ))}
        </div>
      </div>

      <div className="kanban-foot">
        <span className="foot-live">
          <span className="dot-live" />
          sync · wa.api
        </span>
        <span className="muted" style={{ fontSize: 11.5 }}>
          {board.length} oportunidades · arrastra para mover · toca para editar y anotar
        </span>
      </div>

      <LeadDrawer
        card={selected}
        onClose={() => setSelectedId(null)}
        onChange={(patch) => setBoard((prev) => prev.map((c) => (c.id === selectedId ? { ...c, ...patch } : c)))}
      />
    </section>
  )
}
