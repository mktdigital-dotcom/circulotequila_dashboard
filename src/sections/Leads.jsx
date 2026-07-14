import { useRef, useState } from 'react'
import { stages, stageAccents, reactivationStage, pesoCompact } from '../data/circulo.js'
import { postNota, patchLead, cardPatchToNoco, etapaDeStage } from '../data/live.js'

const stageLabel = (n) => stages.find((s) => s.n === n)?.label || '—'
const accentOf = (n) => (n === 'reactivacion' ? '#e2795c' : stageAccents[n] || '#e9b65d')

const marketing = stages.filter((s) => s.n <= 4)
const comercial = stages.filter((s) => s.n >= 5)
// Columna extra para leads en etapa "perdido" (§ reactivación) — sin ella,
// esos leads existían en la base pero no se veían en el tablero.
const reactCol = { n: 'reactivacion', label: reactivationStage.label }

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
  const [autor, setAutor] = useState(() => {
    try { return localStorage.getItem('circulo.autor') || '' } catch { return '' }
  })
  const [savingNota, setSavingNota] = useState(false)
  const [notaErr, setNotaErr] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editErr, setEditErr] = useState('')
  if (!card) return null
  const set = (patch) => onChange(patch)
  const accent = accentOf(card.stage)

  // Compuerta de calificación alineada a la arquitectura §05 (lo que el agente
  // sí detecta): ciudad, volumen ≥ 12, propósito y señal de comportamiento.
  const checks = [
    { name: 'Ciudad', ok: !!card.ciudad && card.ciudad !== '—', val: card.ciudad || '—' },
    { name: 'Volumen ≥ 12', ok: (card.volumen || 0) >= 12, val: card.volumen ? card.volumen + ' bot' : '—' },
    { name: 'Propósito', ok: !!card.proposito, val: card.proposito || '—' },
    {
      name: 'Señal de comportamiento',
      ok: card.tier === 'A' || card.tier === 'B' || (card.score || 0) >= 40,
      val: card.tier ? 'tier ' + card.tier + (card.score != null ? ' · ' + card.score : '') : '—',
    },
  ]
  const completeness = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100)

  const addTag = () => {
    const t = tagInput.trim()
    if (!t) return
    set({ tags: [...(card.tags || []), t] })
    setTagInput('')
  }
  // Al salir de edición, guarda los cambios en NocoDB → compartido y persistente
  // (si no, el polling los revertiría). Solo si el lead ya existe en la base.
  const toggleEditing = async () => {
    if (editing && card.ncId != null) {
      setSavingEdit(true)
      setEditErr('')
      try {
        await patchLead(card.ncId, cardPatchToNoco({
          stage: card.stage, name: card.name, ciudad: card.ciudad,
          volumen: card.volumen, proposito: card.proposito, linea: card.linea,
        }))
      } catch (e) {
        setEditErr('No se guardó en la base: ' + (e.message || e))
      } finally {
        setSavingEdit(false)
      }
    }
    setEditing((e) => !e)
  }
  // Nota COMPARTIDA: se guarda en NocoDB (tabla Notas) para que Libia y Kenia
  // la vean desde cualquier navegador. Optimista: aparece al instante y el
  // polling la confirma desde la base.
  const saveNota = async () => {
    const t = note.trim()
    if (!t || savingNota) return
    const who = (autor.trim() || 'anónimo')
    try { localStorage.setItem('circulo.autor', who) } catch {}
    setSavingNota(true)
    setNotaErr('')
    try {
      await postNota({ leadId: card.id, autor: who, texto: t })
      set({
        notasLive: [
          ...(card.notasLive || []),
          { autor: who, texto: t, ts: new Date().toISOString().slice(0, 16).replace('T', ' ') },
        ],
      })
      setNote('')
    } catch (e) {
      setNotaErr(String(e.message || e))
    } finally {
      setSavingNota(false)
    }
  }

  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" style={{ '--accent': accent }} onClick={(e) => e.stopPropagation()}>
        <div className="drawer__head">
          {editing ? (
            <Sel v={card.stage} set={(v) => set({ stage: Number(v) })} opts={stages.map((s) => ({ v: s.n, l: `${s.n} · ${s.label}` }))} />
          ) : (
            <span className="chip chip--stage" style={{ color: accent, borderColor: accent + '55' }}>
              {card.stage === 'reactivacion' ? 'Reactivación' : `Etapa ${card.stage} · ${stageLabel(card.stage)}`}
            </span>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={'edit-btn' + (editing ? ' is-on' : '')} onClick={toggleEditing} disabled={savingEdit}>
              {savingEdit ? 'Guardando…' : editing ? '✓ Listo' : 'Editar'}
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
        {editErr && <div className="muted" style={{ fontSize: 11, color: 'var(--red)' }}>{editErr}</div>}

        {card.necesitaAsesor && (
          <div className="asesor-banner">
            🙋 <b>Necesita asesor</b> — el sistema pasó esta conversación a un humano.
            {card.vendedor ? ` Asignado: ${card.vendedor}.` : ' Sin asesor asignado aún.'}
          </div>
        )}
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

        {/* Data que el agente recopila en la conversación (NocoDB) */}
        <div className="drawer__section">
          <div className="drawer__label">Data del agente · NocoDB</div>
          <div className="ctx-grid">
            <Field label="Línea de negocio"><span className="chip">{card.linea || '—'}</span></Field>
            <Field label="Propósito">{card.proposito || '—'}</Field>
            <Field label="Volumen">{card.volumen ? card.volumen + ' bot' : '—'}</Field>
            <Field label="Ciudad">
              {card.ciudad || '—'}
              {card.ciudadValidada && card.ciudadValidada !== card.ciudad && (
                <span className="chip chip--soft" style={{ marginLeft: 6 }}>validada: {card.ciudadValidada}</span>
              )}
              {card.ciudadValidada && card.ciudadValidada === card.ciudad && (
                <span className="chip chip--soft" style={{ marginLeft: 6 }}>✓ validada</span>
              )}
            </Field>
            <Field label="Tipo de lead">{card.tipoLead || '—'}</Field>
            <Field label="Canal">{card.canal || '—'}</Field>
            <Field label="Origen / campaña">
              {card.origen || card.campana || '—'}
              {card.origenFuente === 'frase de apertura' && (
                <span className="chip chip--soft" style={{ marginLeft: 6 }}>por frase</span>
              )}
            </Field>
            {card.anuncio && <Field label="Anuncio">{card.anuncio}</Field>}
            <Field label="Contacto">{card.contacto || '—'}</Field>
            <Field label="Fecha de entrada">{card.fecha || '—'}</Field>
            <Field label="Tier · score">
              {card.tier ? (
                <span className="chip">{card.tier}{card.score != null ? ' · ' + card.score : ''}</span>
              ) : '—'}
            </Field>
            {card.vendedor && <Field label="Vendedor asignado">{card.vendedor}</Field>}
          </div>
        </div>

        {card.contexto && (
          <div className="drawer__section">
            <div className="drawer__label">Contexto (resumen del agente)</div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-soft)' }}>{card.contexto}</p>
          </div>
        )}

        <div className="drawer__section">
          <div className="drawer__label">Estatus y próximo toque</div>
          <div className="ctx-grid">
            <Field label="Estatus MKT">{card.estatusMkt || '—'}</Field>
            <Field label="Etapa">{card.etapaTxt || '—'}</Field>
            <Field label="Próximo toque">
              <span className={card.proximo?.startsWith('⚠') ? 'lead-next warn' : ''}>{card.proximo || '—'}</span>
            </Field>
            <Field label="Responsable">{card.responsable || '—'}</Field>
            {card.requalifyAt && <Field label="Reactivar el">{card.requalifyAt}</Field>}
          </div>
        </div>

        {/* Compuerta de calificación (§05) */}
        <div className="drawer__section">
          <div className="drawer__label">
            Compuerta · calificación
            <span className="gate-pct" style={{ color: completeness >= 80 ? 'var(--green)' : completeness >= 50 ? 'var(--gold)' : 'var(--red)' }}>{completeness}% completo</span>
          </div>
          <div className="gate-list">
            {checks.map((c) => (
              <div className="gate-item" key={c.name}>
                <span className={'gate-dot' + (c.ok ? ' ok' : '')}>{c.ok ? '✓' : '○'}</span>
                <span className="gate-name">{c.name}</span>
                <span className="gate-val">{String(c.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* notas compartidas · qué funcionó / qué no (Libia + Kenia, en NocoDB) */}
        <div className="drawer__section">
          <div className="drawer__label">
            Notas de la prueba · compartidas
            {card.esPrueba && <span className="chip chip--soft" style={{ marginLeft: 6 }}>🧪 prueba</span>}
          </div>
          <div className="note-add">
            <input
              className="d-input"
              value={autor}
              placeholder="Tu nombre (Libia / Kenia)…"
              onChange={(e) => setAutor(e.target.value)}
              style={{ marginBottom: 6 }}
            />
            <textarea
              className="d-textarea"
              value={note}
              placeholder="¿Qué funcionó y qué no en esta prueba?"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveNota() } }}
            />
            <button className="btn-export" style={{ height: 34, fontSize: 12 }} onClick={saveNota} disabled={savingNota}>
              {savingNota ? 'Guardando…' : 'Guardar nota'}
            </button>
          </div>
          {notaErr && <div className="muted" style={{ fontSize: 11, color: 'var(--red)' }}>{notaErr}</div>}
          <div className="notes">
            {(card.notasLive || []).length === 0 && <div className="muted" style={{ fontSize: 12 }}>Sin notas todavía. Documenta aquí qué funcionó y qué no.</div>}
            {(card.notasLive || []).map((nt, i) => (
              <div className="note" key={i}>
                <div className="note__body">
                  <span className="note__t">{nt.autor || 'anónimo'} · {nt.ts}</span>
                  <p>{nt.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {card.events?.length > 0 && (
          <div className="drawer__section">
            <div className="drawer__label">Conversación</div>
            <div className="conv">
              {card.events.map((ev, i) => {
                const agente = /agent|bot|sistema/i.test(ev.actor || ev.tipo || '')
                return (
                  <div className={'conv-msg ' + (agente ? 'conv-msg--agent' : 'conv-msg--client')} key={i}>
                    <div className="conv-who">{agente ? 'Agente' : 'Cliente'} · {ev.t}</div>
                    <div className="conv-bubble">{ev.e}</div>
                  </div>
                )
              })}
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
        <span className="kcol__num" style={{ background: accent }}>{stage.n === 'reactivacion' ? '↻' : stage.n}</span>
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
            {(c.tags?.length > 0 || c.notasLive?.length > 0) && (
              <div className="kcard__tags">
                {(c.tags || []).map((t) => (
                  <span key={t} className={'ktag' + (t === 'reactivación' ? ' ktag--react' : t === 'necesita asesor' ? ' ktag--asesor' : '')}>
                    {t === 'necesita asesor' ? '🙋 necesita asesor' : t}
                  </span>
                ))}
                {c.notasLive?.length > 0 && <span className="ktag ktag--note">✎ {c.notasLive.length}</span>}
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
    // Escribe la etapa en NocoDB para que el movimiento sea compartido y no se
    // revierta en el siguiente polling. Solo si el lead ya existe en la base.
    const c = board.find((x) => x.id === id)
    if (c?.ncId != null) patchLead(c.ncId, { etapa: etapaDeStage(stageN) }).catch(() => {})
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
          <Column key="reactivacion" stage={reactCol} board={board} match={match} overStage={overStage} setOverStage={setOverStage} onDrop={onDrop}
            onDragStartCard={(id) => { dragId.current = id; draggedRef.current = true }}
            onDragEndCard={() => { dragId.current = null; setOverStage(null) }}
            onClickCard={onClickCard} />
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
