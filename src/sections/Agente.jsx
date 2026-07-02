import { useEffect, useMemo, useRef, useState } from 'react'
import { simConfig, WEBHOOK_URL, WEBHOOK_PATH_DEV } from '../data/circulo.js'
import { detectChannel, scoreLead, TIER_INFO } from '../data/simLogic.js'

const now = () =>
  new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })

// En dev pasamos por el proxy de Vite (evita CORS); en prod, URL directa.
const ENDPOINT = import.meta.env.DEV ? WEBHOOK_PATH_DEV : WEBHOOK_URL

// Llama al webhook real del flujo n8n "Círculo WEB" con el MISMO formato de
// payload que envía ManyChat en producción — así la prueba es fiel al canal real.
async function callWebhook({ phone, text, name }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 45000)
  const digits = phone.replace(/\D/g, '')
  const parts = (name || 'Prueba WhatsApp').trim().split(/\s+/)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    if (!res.ok) throw new Error('HTTP ' + res.status)
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
function buildSimLead(phone, messages, det, sc, testName) {
  const stage = sc?.gate
    ? 'reactivacion'
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
    id: 'SIM-' + phone.replace(/\D/g, '').slice(-4),
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
    proximo: sc?.tier === 'A' ? 'Handoff a asesor de la ciudad' : 'Continuar la calificación',
  }
}

export default function Agente({ onLead, goToPipeline }) {
  const [phone, setPhone] = useState(simConfig.testPhones[0].phone)
  const [testName, setTestName] = useState('Kenia Prueba')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState('')
  const [deteccion, setDeteccion] = useState(null)
  const [score, setScore] = useState(null)
  const [signalLog, setSignalLog] = useState([])
  const scroller = useRef(null)

  // Todo el texto que ha escrito el cliente en esta sesión (para el Motor de Score).
  const userText = useMemo(
    () => messages.filter((m) => m.who === 'user').map((m) => m.text).join(' '),
    [messages]
  )
  const sessionId = 'mc_' + phone

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const resetChat = () => {
    setMessages([])
    setDeteccion(null)
    setScore(null)
    setSignalLog([])
    setError('')
  }

  // Al cambiar de teléfono cambia la sesión de memoria → arrancamos limpio.
  const changePhone = (p) => {
    setPhone(p)
    resetChat()
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
          : 'No se pudo conectar con el webhook. Si esto ocurre fuera del entorno de desarrollo, revisa que el nodo Webhook de n8n permita CORS para este dominio.'
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
          <div className="eyebrow">Agente IA · simulador WhatsApp</div>
          <h1 className="headline">
            Así contesta <span className="gold">en WhatsApp.</span>
          </h1>
          <p className="subhead">
            Conectado al flujo real de n8n. Escribe como un prospecto y el agente responde con la
            misma lógica de producción — detección de campaña, calificación y handoff incluidos.
          </p>
        </div>
      </div>

      <div className="sim">
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

        {/* ── Rail: configuración + detrás del telón ────────────────────────── */}
        <div className="rail">
          <div className="card rail__card">
            <div className="rail__title">teléfono_de_prueba</div>
            <div className="phone-pills">
              {simConfig.testPhones.map((p) => (
                <button
                  key={p.phone}
                  className={'phone-pill ' + (p.phone === phone ? 'is-active' : '')}
                  onClick={() => changePhone(p.phone)}
                >
                  {p.label}
                  <span className="phone-pill__num">{p.phone}</span>
                </button>
              ))}
            </div>
            <div className="rail__hint">
              Solo estos números reciben respuesta (gate del flujo). Cada uno es una sesión de
              memoria independiente.
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
