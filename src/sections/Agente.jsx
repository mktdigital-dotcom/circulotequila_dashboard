import { useEffect, useRef, useState } from 'react'
import { agentSim } from '../data/circulo.js'

const now = () =>
  new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })

// El cerebro del agente = el SOP de Círculo. Nunca inventa precios: solo cita
// la lista oficial y, ante una regla dura, sella el handoff.
function respond(text) {
  const t = text.toLowerCase()
  if (/(descuento|%|rebaja|más barato|mas barato|muy caro|caro)/.test(t))
    return { text: 'Ese ajuste lo ve directo el equipo. Te conecto con Kenia para cerrar el precio. ⊕', handoff: true, log: 'descuento / precio especial' }
  if (/(sinaloa|chiapas|enví|envi|cobertura|llega hasta|mandan a)/.test(t))
    return { text: 'Atendemos toda la República, pero esa ruta la valido con el equipo antes de prometer. Te confirmo cobertura y tiempos en breve. ⊕', handoff: true, log: 'zona no servida' }
  if (/(\b[1-9]\b|\b1[01]\b)\s*botell|3 botella|menos de 12|pocas botellas/.test(t))
    return { text: 'El pedido mínimo para ediciones personalizadas es de 12 botellas. ¿Te ayudo a ajustar la cantidad o a ver la línea regular?', handoff: false, log: 'pedido < mínimo' }
  if (/(precio|cuesta|cuánto|cuanto|costo|vale)/.test(t))
    return { text: 'Depende de la expresión: Blanco 750 ml $2,250 · Joven $2,600 · Reposado $2,900. En ediciones, 375 ml $1,600 y 750 ml $2,250 (mínimo 12). ¿Para qué ocasión es?', handoff: false }
  if (/(tiempo|entrega|cuándo|cuando|días|dias|tarda)/.test(t))
    return { text: 'Una vez autorizado el arte final, la entrega estimada es de 20 días hábiles. Para iniciar se pide anticipo del 50%.', handoff: false }
  if (/(personaliz|diseñ|disen|logo|grabad|estuche|marca)/.test(t))
    return { text: 'Desarrollamos un diseño exclusivo con tu logo, colores y mensajes — incluye botella y estuche. Pedido mínimo 12 botellas. ¿Me compartes tu marca y la ocasión?', handoff: false }
  if (/(pago|pagar|transfer|mercado|anticipo|factura)/.test(t))
    return { text: 'Aceptamos transferencia bancaria y Mercado Pago. Para proyectos personalizados se pide anticipo del 50% para iniciar producción.', handoff: false }
  if (/(hola|buenas|buen día|buen dia|info|informaci)/.test(t))
    return { text: '¡Hola! Con gusto te ayudo con nuestras Ediciones Empresariales de Círculo 😊 ¿Es para un evento, regalo corporativo o reventa?', handoff: false }
  return { text: 'Con gusto. Para darte la mejor opción: ¿cuántas botellas consideras, en qué ciudad y para qué ocasión?', handoff: false }
}

export default function Agente() {
  const [messages, setMessages] = useState(agentSim.seed)
  const [log, setLog] = useState(agentSim.handoffLog)
  const [input, setInput] = useState('')
  const scroller = useRef(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = (raw) => {
    const text = (raw ?? input).trim()
    if (!text) return
    const t = now()
    setInput('')
    setMessages((m) => [...m, { who: 'user', text, t }])
    const r = respond(text)
    setTimeout(() => {
      const t2 = now()
      setMessages((m) => [...m, { who: 'agent', text: r.text, t: t2, handoff: r.handoff }])
      if (r.handoff) setLog((l) => [{ reason: r.log, t: t2 }, ...l])
    }, 450)
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <div className="eyebrow">Agente IA · pruebas</div>
          <h1 className="headline">
            No inventa: <span className="gold">deriva.</span>
          </h1>
          <p className="subhead">
            Responde con el SOP de Círculo cargado — voz de marca, catálogo real, reglas duras.
            Cuando debe derivar, sella la transferencia con motivo y hora.
          </p>
        </div>
      </div>

      <div className="sim">
        {/* Chat */}
        <div className="card chat">
          <div className="chat__head">
            <span className="chat__avatar">C</span>
            <div>
              <div className="chat__name">Círculo · agente</div>
              <div className="chat__status">
                <span className="dot-live" /> en línea · wa.api
              </div>
            </div>
            <span className="chat__session">sesión {agentSim.session}</span>
          </div>

          <div className="chat__msgs" ref={scroller}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  'bubble ' +
                  (m.who === 'user' ? 'bubble--user' : m.handoff ? 'bubble--handoff' : 'bubble--agent')
                }
              >
                {m.text}
                <span className="bubble__t">
                  {m.t}
                  {m.handoff ? ' · handoff' : ''}
                </span>
              </div>
            ))}
          </div>

          <form
            className="chat__input"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje de prueba…"
            />
            <button type="submit" className="chat__send" aria-label="Enviar">↑</button>
          </form>
        </div>

        {/* Rail */}
        <div className="rail">
          <div className="card rail__card">
            <div className="rail__title">pruebas_de_riesgo</div>
            <div className="risk-list">
              {agentSim.risks.map((r) => (
                <button key={r.label} className="risk-btn" onClick={() => send(r.send)}>
                  <span className="dot-mini bg-orange" />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card rail__card">
            <div className="rail__title">bitácora_de_handoffs</div>
            <div className="hlog">
              {log.map((h, i) => (
                <div className="hlog__row" key={i}>
                  <span>
                    <span className="dot-mini bg-orange" /> {h.reason}
                  </span>
                  <span className="hlog__t">{h.t}</span>
                </div>
              ))}
            </div>
            <div className="incidents">
              Incidentes de precio inventado: <b>0</b>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
