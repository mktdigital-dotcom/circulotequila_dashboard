import { useEffect, useMemo, useRef, useState } from 'react'
import { simConfig, WEBHOOK_PATH_DEV } from '../data/circulo.js'
import { detectChannel, scoreLead, TIER_INFO } from '../data/simLogic.js'
import { fetchNotas, postNota, getAppKey, fetchConversacion } from '../data/live.js'

const now = () =>
  new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })

// En dev pasamos por el proxy de Vite (evita CORS y va directo a n8n en local).
// En prod, por el proxy serverless /api/agente (candado + URL/secreto server-side).
const ENDPOINT = import.meta.env.DEV ? WEBHOOK_PATH_DEV : '/api/agente'

// Llama al webhook real del flujo n8n "Círculo WEB" con el MISMO formato de
// payload que envía ManyChat en producción — así la prueba es fiel al canal real.
async function callWebhook({ phone, text, name }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 45000)
  const digits = phone.replace(/\D/g, '')
  const parts = (name || 'Prueba WhatsApp').trim().split(/\s+/)
  try {
    const appKey = getAppKey()
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(appKey ? { 'x-app-key': appKey } : {}) },
      signal: ctrl.signal,
      body: JSON.stringify({
        key: 'user:sim' + digits.slice(-10),
        id: 'sim' + digits.slice(-10),
        page_id: '',
        user_refs: [],
        status: 'active',
        first_name: parts[0],
        last_name: parts.slice(1).join(' ') || null,
        name: name || 'Prueba WhatsApp',
        gender: null,
        profile_pic: null,
        locale: null,
        language: null,
        timezone: 'UTC±00',
        live_chat_url: '',
        last_input_text: text,
        optin_phone: false,
        phone: null,
        optin_email: false,
        email: null,
        subscribed: new Date().toISOString(),
        last_interaction: null,
        ig_last_interaction: null,
        last_seen: null,
        ig_last_seen: null,
        is_followup_enabled: true,
        ig_username: null,
        ig_id: null,
        whatsapp_phone: phone,
        whatsapp_bsuid: null,
        whatsapp_username: null,
        optin_whatsapp: true,
        phone_country_code: null,
        last_growth_tool: null,
        custom_fields: {},
      }),
    })
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '')
      throw new Error('HTTP ' + res.status + (cuerpo ? ' · ' + cuerpo.slice(0, 200) : ''))
    }
    const data = await res.json()
    // { ok:true, respuesta:[{parte:"..."}, ...] }  ·  toleramos formatos alternos
    let partes = []
    const r = data?.respuesta ?? data
    if (Array.isArray(r)) partes = r.map((x) => (typeof x === 'string' ? x : x?.parte)).filter(Boolean)
    else if (typeof r === 'string') partes = [r]
    if (!partes.length) partes = ['Gracias por tu mensaje, en un momento te ayudo.']
    return { partes }
  } finally {
    clearTimeout(timer)
  }
}

// Construye un lead a partir de la conversación de prueba, con el mismo formato
// que usa el Pipeline — para que el simulador se registre como un lead real.
// ¿El cliente aceptó explícitamente avanzar al siguiente paso (agendar/llamada/
// asesor/handoff)? Ese hito conductual = etapa "interesado", más allá del score.
function aceptoAvanzar(messages) {
  const t = (messages || [])
    .filter((m) => m.who === 'user')
    .map((m) => (m.text || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .join(' ')
  return /(agend|llamad|llamar|reunion|cita|asesor|vendedor|siguiente paso|avanzar|me interesa|si quiero|acepto|adelante|de acuerdo|hagamoslo|procede|contact)/.test(t)
}

function buildSimLead(phone, messages, det, sc, testName) {
  const avanza = !sc?.gate && aceptoAvanzar(messages)
  const stage = sc?.gate
    ? 'reactivacion'
    : avanza
      ? 4
      : sc?.tier === 'A'
        ? 4
        : sc?.tier === 'B'
          ? 3
          : messages.filter((m) => m.who === 'user').length >= 2
            ? 2
            : 1
  const bottles = sc?.bottles ?? null
  const ciudad = det?.ciudad || '—'
  const campana = det?.campana || ''
  return {
    // MISMO id que el lead que el webhook guarda en NocoDB (lead_id = mc_<tel>),
    // para que la vista previa local y la fila real de NocoDB sean UNA sola tarjeta:
    // el preview aparece al instante y NocoDB (etapa/score reales) lo reemplaza al
    // siguiente polling. Sin duplicados.
    id: 'mc_' + phone,
    esPrueba: true,
    stage,
    name: (testName || 'Prueba') + ' 🧪',
    empresa: campana ? 'prueba · ' + campana : 'prueba del simulador',
    ciudad,
    bot: bottles != null ? bottles + ' bot' : '— bot',
    volumen: bottles ?? undefined,
    ocasion: det?.linea || 'simulador',
    proposito: det?.linea || '',
    value: bottles != null ? bottles * 2250 : null,
    valor: bottles != null ? bottles * 2250 : null,
    valueEstimated: bottles != null,
    tier: sc?.tier || null,
    score: sc?.score ?? null,
    canal: 'whatsapp',
    linea: det?.linea || '',
    campana,
    estatusMkt: 'Prueba del simulador',
    contexto: (messages.find((m) => m.who === 'user')?.text || '').slice(0, 160),
    tags: ['prueba', campana].filter(Boolean),
    notes: [],
    events: messages.map((m) => ({ t: m.t, e: m.text, tipo: m.who === 'user' ? 'cliente' : 'agente' })),
    ultima: 'ahora',
    dias: 0,
    responsable: 'Agente IA · simulador',
    vendedor: stage >= 5 ? ciudad : null,
    proximo:
      stage === 4 || sc?.tier === 'A' ? 'Handoff a asesor de la ciudad' : 'Continuar la calificación',
  }
}

// Sesiones de prueba extra creadas al vuelo ("+ Nueva prueba"): cada una tiene
// su propio teléfono sintético (prefijo +521555000) = conversación y lead nuevos.
const SESSIONS_KEY = 'circulo.simsessions.v1'
const loadSessions = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || []
  } catch {
    return []
  }
}
const saveSessions = (a) => {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(a))
  } catch {}
}

// El historial de cada conversación de prueba se queda guardado por teléfono
// (localStorage): al cambiar de teléfono o recargar, la conversación sigue ahí.
const SIM_STORE = 'circulo.simchat.v1'
const loadStore = () => {
  try {
    return JSON.parse(localStorage.getItem(SIM_STORE)) || {}
  } catch {
    return {}
  }
}
const saveStore = (s) => {
  try {
    localStorage.setItem(SIM_STORE, JSON.stringify(s))
  } catch {}
}

export default function Agente({ onLead, goToPipeline }) {
  const firstPhone = simConfig.testPhones[0].phone
  const [phone, setPhone] = useState(firstPhone)
  // Sesiones extra creadas con "+ Nueva prueba" (además de los 3 fijos).
  const [sessions, setSessions] = useState(loadSessions)
  const [testName, setTestName] = useState(() => loadStore()[firstPhone]?.testName || 'Kenia Prueba')
  const [messages, setMessages] = useState(() => loadStore()[firstPhone]?.messages || [])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState('')
  const [deteccion, setDeteccion] = useState(() => loadStore()[firstPhone]?.deteccion || null)
  const [score, setScore] = useState(() => loadStore()[firstPhone]?.score || null)
  const [signalLog, setSignalLog] = useState(() => loadStore()[firstPhone]?.signalLog || [])
  const scroller = useRef(null)

  // Notas de la prueba (compartidas · NocoDB, por lead_id = mc_<tel>): qué funcionó
  // y qué no. Kenia y Libia las ven desde cualquier navegador.
  const [notas, setNotas] = useState([])
  const [nota, setNota] = useState('')
  const [autorNota, setAutorNota] = useState(() => {
    try { return localStorage.getItem('circulo.autor') || '' } catch { return '' }
  })
  const [savingNota, setSavingNota] = useState(false)
  const [notaErr, setNotaErr] = useState('')

  // Persiste la sesión del teléfono activo en cada cambio.
  useEffect(() => {
    const s = loadStore()
    s[phone] = { messages, deteccion, score, signalLog, testName }
    saveStore(s)
  }, [phone, messages, deteccion, score, signalLog, testName])

  // Carga las notas compartidas de la sesión activa (y al cambiar de teléfono).
  useEffect(() => {
    let alive = true
    setNotas([])
    fetchNotas('mc_' + phone).then((rows) => { if (alive) setNotas(rows) }).catch(() => {})
    return () => { alive = false }
  }, [phone])

  // Carga la CONVERSACIÓN de la sesión activa desde NocoDB (compartida). Si la
  // base tiene mensajes de esa prueba, se muestran — así ves las de Kenia desde
  // cualquier navegador. Solo al abrir/cambiar de sesión (no pisa lo que tecleas).
  useEffect(() => {
    let alive = true
    fetchConversacion('mc_' + phone).then((rows) => {
      if (alive && rows.length) setMessages(rows)
    }).catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone])


  const guardarNota = async () => {
    const t = nota.trim()
    if (!t || savingNota) return
    const who = autorNota.trim() || 'anónimo'
    try { localStorage.setItem('circulo.autor', who) } catch {}
    setSavingNota(true)
    setNotaErr('')
    try {
      await postNota({ leadId: 'mc_' + phone, autor: who, texto: t })
      setNotas((prev) => [...prev, { autor: who, texto: t, ts: new Date().toISOString().slice(0, 16).replace('T', ' ') }])
      setNota('')
    } catch (e) {
      setNotaErr(String(e.message || e))
    } finally {
      setSavingNota(false)
    }
  }

  // Todo el texto que ha escrito el cliente en esta sesión (para el Motor de Score).
  const userText = useMemo(
    () => messages.filter((m) => m.who === 'user').map((m) => m.text).join(' '),
    [messages]
  )
  const sessionId = 'mc_' + phone

  // Etiqueta de cada sesión: el NOMBRE de la prueba (testName) de esa sesión, no
  // un genérico "Prueba N". La activa usa el nombre en vivo; las demás, el guardado.
  const nombreDe = (ph, fallback) => {
    const n = ph === phone ? testName : loadStore()[ph]?.testName
    return (n && n.trim()) || fallback
  }

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const resetChat = () => {
    setMessages([])
    setDeteccion(null)
    setScore(null)
    setSignalLog([])
    setError('')
    const s = loadStore()
    delete s[phone]
    saveStore(s)
  }

  // Al cambiar de teléfono se carga SU historial guardado (cada número es una
  // conversación de prueba independiente que persiste).
  const changePhone = (p) => {
    const sess = loadStore()[p] || {}
    setPhone(p)
    setMessages(sess.messages || [])
    setDeteccion(sess.deteccion || null)
    setScore(sess.score || null)
    setSignalLog(sess.signalLog || [])
    setTestName(sess.testName || 'Prueba nueva')
    setError('')
  }

  // Crea una sesión de prueba nueva (teléfono sintético con prefijo de prueba) y
  // arranca su conversación en limpio.
  const nuevaPrueba = () => {
    const n = simConfig.testPhones.length + sessions.length + 1
    const newPhone = '+521555' + String(1000000 + n).slice(-7)
    const label = 'Prueba ' + n
    const next = [...sessions, { phone: newPhone, label }]
    setSessions(next)
    saveSessions(next)
    const s = loadStore()
    s[newPhone] = { messages: [], deteccion: null, score: null, signalLog: [], testName: label }
    saveStore(s)
    setPhone(newPhone)
    setMessages([])
    setDeteccion(null)
    setScore(null)
    setSignalLog([])
    setTestName(label)
    setError('')
  }

  const borrarSesion = (p) => {
    const next = sessions.filter((s) => s.phone !== p)
    setSessions(next)
    saveSessions(next)
    const store = loadStore()
    delete store[p]
    saveStore(store)
    if (p === phone) changePhone(firstPhone)
  }

  const send = async (raw) => {
    const text = (raw ?? input).trim()
    if (!text || typing) return
    setError('')
    setInput('')

    const userMsg = { who: 'user', text, t: now(), status: 'sent' }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)

    // ── Réplica de la lógica del backend (para el panel "detrás del telón") ──
    const det = detectChannel(text, {})
    const merged =
      !deteccion || (det.campana && !deteccion.campana)
        ? { ...(deteccion || {}), ...Object.fromEntries(Object.entries(det).filter(([, v]) => v)) }
        : deteccion
    setDeteccion(merged)

    const combined = nextMessages.filter((m) => m.who === 'user').map((m) => m.text).join(' ')
    const sc = scoreLead(combined, merged)
    setScore(sc)
    if (sc.signals?.length) {
      setSignalLog((prev) => {
        const seen = new Set(prev.map((s) => s.senal))
        const fresh = sc.signals.filter((s) => !seen.has(s.senal)).map((s) => ({ ...s, t: now() }))
        return [...fresh, ...prev].slice(0, 12)
      })
    }

    // Marca el mensaje como entregado.
    setMessages((m) =>
      m.map((x) => (x === userMsg ? { ...x, status: 'delivered' } : x))
    )

    // El lead de prueba entra al Pipeline de inmediato y se va enriqueciendo.
    onLead?.(buildSimLead(phone, nextMessages, merged, sc, testName))

    // ── Llamada al webhook real ──────────────────────────────────────────────
    setTyping(true)
    try {
      const { partes } = await callWebhook({ phone, text, name: testName })
      setMessages((m) => m.map((x) => (x.who === 'user' ? { ...x, status: 'read' } : x)))
      const convo = [...nextMessages]
      // Cada "parte" es una burbuja separada, escalonada como en WhatsApp real.
      for (let i = 0; i < partes.length; i++) {
        const agentMsg = { who: 'agent', text: partes[i], t: now() }
        convo.push(agentMsg)
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, i === 0 ? 200 : 700))
        setMessages((m) => [...m, agentMsg])
      }
      // Actualiza el lead con la respuesta del agente en su línea de tiempo.
      onLead?.(buildSimLead(phone, convo, merged, sc, testName))
    } catch (e) {
      const msg =
        e.name === 'AbortError'
          ? 'El agente tardó demasiado (timeout). El flujo hace una espera de ~5s antes de responder; intenta de nuevo.'
          : `No se pudo contactar al agente vía /api/agente — ${e.message || e}. ` +
            '(404: falta desplegar la función · 401: falta iniciar sesión · 502/404 del webhook: WEBHOOK_SIMULADOR apunta a un webhook que no existe o el flujo n8n no está activo.)'
      setError(msg)
    } finally {
      setTyping(false)
    }
  }

  const tier = score?.tier ? TIER_INFO[score.tier] : null

  return (
    <section>
      <div className="section-head">
        <div>
          <div className="eyebrow">Agente IA</div>
          <h1 className="headline">
            Simulador de <span className="gold">Agente de IA</span>
          </h1>
          <p className="subhead">
            Conectado al flujo real de n8n. Escribe como un prospecto y el agente responde con la
            misma lógica de producción — detección de campaña, calificación y handoff incluidos.
          </p>
        </div>
      </div>

      <div className="sim">
        {/* ── Columna central: chat + notas de la prueba ────────────────────── */}
        <div className="sim-main">
        {/* ── Teléfono WhatsApp ─────────────────────────────────────────────── */}
        <div className="wa">
          <div className="wa__head">
            <span className="wa__avatar">C</span>
            <div className="wa__id">
              <div className="wa__name">Círculo Tequila</div>
              <div className="wa__status">
                {typing ? 'escribiendo…' : 'en línea'}
              </div>
            </div>
            <button className="wa__reset" onClick={resetChat} title="Reiniciar chat">
              ⟳
            </button>
          </div>

          <div className="wa__msgs" ref={scroller}>
            <div className="wa__daytag">hoy · sesión {sessionId}</div>

            {messages.length === 0 && (
              <div className="wa__empty">
                Elige un inicio de campaña o escribe un mensaje para comenzar.
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={'wa-bubble ' + (m.who === 'user' ? 'wa-out' : 'wa-in')}>
                <span className="wa-bubble__txt">{m.text}</span>
                <span className="wa-bubble__meta">
                  {m.t}
                  {m.who === 'user' && (
                    <span className={'wa-check ' + (m.status === 'read' ? 'wa-check--read' : '')}>
                      {m.status === 'sent' ? '✓' : '✓✓'}
                    </span>
                  )}
                </span>
              </div>
            ))}

            {typing && (
              <div className="wa-bubble wa-in wa-typing">
                <span className="wa-dot" />
                <span className="wa-dot" />
                <span className="wa-dot" />
              </div>
            )}
          </div>

          {error && <div className="wa__error">{error}</div>}

          <form
            className="wa__input"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje…"
              disabled={typing}
            />
            <button type="submit" className="wa__send" aria-label="Enviar" disabled={typing}>
              ➤
            </button>
          </form>
        </div>

        {/* ── Notas de la prueba · en el centro, justo debajo del chat ───────── */}
        <div className="card card--pad-lg sim-notas">
          <div className="card__head">
            <span className="card__tag">Notas de la prueba · compartidas</span>
            <span className="card__q">Qué funcionó y qué no en {testName || 'esta prueba'}</span>
          </div>
          <div className="sim-notas__form">
            <input
              className="d-input"
              value={autorNota}
              onChange={(e) => setAutorNota(e.target.value)}
              placeholder="Tu nombre (Libia / Kenia)…"
            />
            <textarea
              className="d-textarea"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="¿Qué funcionó y qué no en la conversación?"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); guardarNota() } }}
            />
            <button className="btn-export" onClick={guardarNota} disabled={savingNota}>
              {savingNota ? 'Guardando…' : 'Guardar nota'}
            </button>
          </div>
          {notaErr && <div className="rail__hint" style={{ color: 'var(--red)', marginTop: 8 }}>{notaErr}</div>}
          <div className="notes" style={{ marginTop: 14 }}>
            {notas.length === 0 && <div className="muted" style={{ fontSize: 12 }}>Sin notas todavía. Documenta aquí qué funcionó y qué no en la conversación.</div>}
            {notas.map((nt, i) => (
              <div className="note" key={i}>
                <div className="note__body">
                  <span className="note__t">{nt.autor} · {nt.ts}</span>
                  <p>{nt.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>{/* /sim-main */}

        {/* ── Rail: configuración + detrás del telón ────────────────────────── */}
        <div className="rail">
          <div className="card rail__card">
            <div className="rail__title">sesiones_de_prueba</div>
            <div className="phone-pills">
              {simConfig.testPhones.map((p) => (
                <button
                  key={p.phone}
                  className={'phone-pill ' + (p.phone === phone ? 'is-active' : '')}
                  onClick={() => changePhone(p.phone)}
                >
                  {nombreDe(p.phone, p.label)}
                  <span className="phone-pill__num">{p.phone}</span>
                </button>
              ))}
              {sessions.map((p) => (
                <div key={p.phone} className={'phone-pill ' + (p.phone === phone ? 'is-active' : '')}>
                  <button className="phone-pill__main" onClick={() => changePhone(p.phone)}>
                    {nombreDe(p.phone, p.label)}
                    <span className="phone-pill__num">{p.phone}</span>
                  </button>
                  <button className="phone-pill__del" onClick={() => borrarSesion(p.phone)} title="Borrar sesión">✕</button>
                </div>
              ))}
            </div>
            <button className="nueva-prueba" onClick={nuevaPrueba}>+ Nueva prueba</button>
            <div className="rail__hint">
              Cada sesión es una conversación aparte, con su propio lead en el Pipeline. Su historial
              queda guardado — cambia entre ellas sin perder nada. ⟳ reinicia solo la actual.
            </div>
            <div className="rail__title" style={{ marginTop: 16 }}>nombre_de_prueba</div>
            <input
              className="d-input"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Nombre del cliente de prueba"
            />
            <div className="rail__hint">
              Va en el payload como en ManyChat (first_name / name) y será el nombre del lead en el
              Pipeline.
            </div>
          </div>

          <div className="card rail__card">
            <div className="rail__title">guía_de_prueba · para Kenia</div>
            <ol className="sim-guide">
              <li>Elige un <b>teléfono de prueba</b> (cada uno es una conversación aparte).</li>
              <li>Pon tu <b>nombre de prueba</b>.</li>
              <li>Toca un <b>inicio de campaña</b> — son las frases reales de los anuncios; el sistema detecta de qué campaña y ciudad viene.</li>
              <li>Conversa como cliente (pide precios, di cuántas botellas, pide llamada…).</li>
              <li>Mira <b>detrás_del_telón</b>: canal, campaña, ciudad, tier y score en vivo.</li>
              <li>Abre el <b>Pipeline</b>: tu prueba quedó guardada como lead 🧪 con toda su data y su conversación.</li>
            </ol>
            <div className="rail__hint">
              El simulador envía al flujo el mismo formato de datos que ManyChat manda en producción.
            </div>
          </div>

          <div className="card rail__card">
            <div className="rail__title">inicios_de_campaña</div>
            <div className="risk-list">
              {simConfig.campaigns.map((c) => (
                <button key={c.label} className="risk-btn" onClick={() => send(c.send)} disabled={typing}>
                  <span className="dot-mini bg-gold" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card rail__card">
            <div className="rail__title">pruebas_de_riesgo</div>
            <div className="risk-list">
              {simConfig.risks.map((r) => (
                <button key={r.label} className="risk-btn" onClick={() => send(r.send)} disabled={typing}>
                  <span className="dot-mini bg-orange" />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detrás del telón: lo que el flujo calcula en paralelo */}
          <div className="card rail__card">
            <div className="rail__title">detrás_del_telón</div>

            {!deteccion && !score && (
              <div className="rail__hint">Envía un mensaje para ver la detección y el score en vivo.</div>
            )}

            {tier && (
              <div className="tier-row">
                <span className="tier-badge" style={{ background: tier.color }}>
                  {score.tier}
                </span>
                <div>
                  <div className="tier-label">
                    {tier.label} · score {score.score}
                  </div>
                  <div className="tier-hint">{score.gate ? 'gate: ' + score.gate : tier.hint}</div>
                </div>
              </div>
            )}

            {deteccion && (
              <div className="detmeta">
                <Meta k="canal" v={deteccion.fuenteSenal} />
                <Meta k="campaña" v={deteccion.campana || '—'} />
                <Meta k="ciudad" v={deteccion.ciudad || '—'} />
                <Meta k="línea" v={deteccion.linea || '—'} />
                {deteccion.vendedor && <Meta k="asesor" v={deteccion.vendedor} />}
                {score?.bottles != null && <Meta k="botellas" v={String(score.bottles)} />}
              </div>
            )}

            {messages.length > 0 && (
              <button className="sim-pipeline-link" onClick={() => goToPipeline?.()}>
                <span className="dot-mini bg-green" /> Guardado en el Pipeline como lead de prueba · ver →
              </button>
            )}

            {signalLog.length > 0 && (
              <div className="hlog" style={{ marginTop: 14 }}>
                {signalLog.map((s, i) => (
                  <div className="hlog__row" key={i}>
                    <span>
                      <span
                        className={'dot-mini ' + (s.puntos < 0 ? 'bg-orange' : 'bg-green')}
                      />
                      {s.senal}
                    </span>
                    <span className="hlog__t">{s.puntos > 0 ? '+' : ''}{s.puntos}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Meta({ k, v }) {
  return (
    <div className="detmeta__row">
      <span className="detmeta__k">{k}</span>
      <span className="detmeta__v">{v}</span>
    </div>
  )
}
