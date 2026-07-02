// ─────────────────────────────────────────────────────────────────────────────
// simLogic.js · Réplica fiel de la lógica del workflow n8n "Círculo WEB".
//
// Estas funciones son un puerto 1:1 de los nodos Code del flujo real:
//   · detectChannel(...)  ←  nodo "Detección de Canal"
//   · scoreLead(...)      ←  nodo "Motor de Score"
//
// El simulador llama al webhook REAL para obtener la respuesta del agente, pero
// además ejecuta esta misma lógica en el navegador para mostrar "detrás del
// telón" lo que el backend está calculando (canal, ciudad, línea, tier, score,
// señales) — datos que el webhook no devuelve al cliente.
// ─────────────────────────────────────────────────────────────────────────────

function norm(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// ── Nodo "Detección de Canal" ────────────────────────────────────────────────
function detectByPhrase(t) {
  if (t.includes('informacion sobre edicion empresarial'))
    return { ciudad: 'otro', origen: 'web_popup_empresarial', linea: 'empresarial' }
  if (t.includes('informacion sobre circulo tequila'))
    return { ciudad: 'otro', origen: 'web_general', linea: '' }
  if (t.startsWith('me encantaria recibir informacion'))
    return { ciudad: 'SLP', origen: 'campana_slp', linea: 'empresarial' }
  if (t.startsWith('podrian darme informacion'))
    return { ciudad: 'Riviera Maya', origen: 'campana_rm', linea: 'empresarial' }
  if (t.startsWith('me gustaria') && t.includes('informacion'))
    return { ciudad: 'CDMX', origen: 'campana_cdmx', linea: 'empresarial' }
  if (t.startsWith('quiero informacion'))
    return { ciudad: 'GDL', origen: 'campana_gdl', linea: 'empresarial' }
  return null
}

export function detectChannel(userText, referral = {}) {
  const t = norm(userText)
  const ref = referral || {}

  const hasReferral = !!(ref.adId || ref.sourceId || ref.ctwaClid || ref.headline)
  let fuenteSenal = 'ninguna'
  let campana = '',
    anuncio = '',
    ciudad = '',
    linea = ''

  if (hasReferral) {
    fuenteSenal = 'referral_meta'
    anuncio = ref.headline || ref.adId || ''
    const h = norm(ref.headline)
    if (h.includes('empresarial')) linea = 'empresarial'
    else if (h.includes('turismo') || h.includes('hotel')) linea = 'turismo'
  }

  const bp = detectByPhrase(t)
  if (bp) {
    if (fuenteSenal === 'ninguna') fuenteSenal = 'frase_apertura'
    ciudad = bp.ciudad
    if (!campana) campana = bp.origen
    if (!linea) linea = bp.linea
  }

  const VEND = { GDL: 'Vendedor GDL', CDMX: 'Vendedor CDMX', 'Riviera Maya': 'Vendedor Riviera Maya' }
  let ciudadValidada = '',
    vendedor = '',
    requiereRevision = false
  if (ciudad && VEND[ciudad]) {
    ciudadValidada = ciudad
    vendedor = VEND[ciudad]
  } else if (ciudad === 'SLP') {
    requiereRevision = true
  }

  return {
    campana,
    anuncio,
    ciudad,
    ciudadValidada,
    vendedor,
    linea,
    fuenteSenal,
    requiereRevision,
    ciudadParaLead: ciudad || 'otro',
    lineaParaLead: linea || 'empresarial',
  }
}

// ── Nodo "Motor de Score" ────────────────────────────────────────────────────
export function scoreLead(combinedText, deteccion = {}) {
  const t = norm(combinedText)
  const d = deteccion || {}

  const signals = []
  const add = (tipo, senal, puntos) => signals.push({ tipo, senal, puntos, actor: 'sistema' })

  let bottles = null
  const m = t.match(/(\d{1,5})\s*(botellas?|pzas?|piezas?|unidades?)/)
  if (m) bottles = parseInt(m[1], 10)

  let gate = ''
  if (/maquila/.test(t)) gate = 'maquila'
  else if (/no me interesa|no me interesan|no gracias/.test(t)) gate = 'no_interesa'
  else if (bottles !== null && bottles < 12) gate = 'volumen_insuficiente'

  let comportamiento = 0
  if (/(agendar|llamada|llamar|reunion|cita)/.test(t)) {
    comportamiento += 12
    add('comportamiento', 'disponibilidad llamada', 12)
  }
  if (
    /(urgente|diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|fin de ano)/.test(
      t
    )
  ) {
    comportamiento += 10
    add('comportamiento', 'urgencia/fecha', 10)
  }
  if (/(precio|costo|cuanto|cotiza)/.test(t)) {
    comportamiento += 5
    add('comportamiento', 'pregunta precio', 5)
  }
  if (/(ya conoc|compre|compramos)/.test(t)) {
    comportamiento += 2
    add('comportamiento', 'conocia la marca', 2)
  }

  let fit = 0
  if (bottles !== null) {
    let pv = 0
    if (bottles >= 100) pv = 25
    else if (bottles >= 50) pv = 20
    else if (bottles >= 24) pv = 14
    else if (bottles >= 12) pv = 8
    if (pv) {
      fit += pv
      add('fit', 'volumen ' + bottles + ' => ' + pv, pv)
    }
  }
  if (/(director|gerente|dueno|presidenta|presidente|fundador|ceo|encargad)/.test(t)) {
    fit += 10
    add('fit', 'decisor', 10)
  }
  if (/(evento|boda|aniversario|cumplea|regalo|reconocimiento|amenidad|hotel)/.test(t)) {
    fit += 4
    add('fit', 'ocasion', 4)
  }
  if (d.ciudad === 'GDL' || d.ciudad === 'CDMX') {
    fit += 3
    add('fit', 'zona fuerte ' + d.ciudad, 3)
  }

  let negativo = 0
  if (/(muy caro|esta caro|carisimo|caro)/.test(t)) {
    negativo += 5
    add('negativo', 'precio caro', -5)
  }

  let fuente = 1.0
  if (d.campana === 'web_general') fuente = 0.85

  const score = Math.round((comportamiento + fit - negativo) * fuente)
  let tier
  if (gate) tier = 'D'
  else if (score >= 70) tier = 'A'
  else if (score >= 40) tier = 'B'
  else tier = 'C'

  return { score, tier, bottles, gate, signals, comportamiento, fit, negativo, fuente }
}

export const TIER_INFO = {
  A: { label: 'Caliente', color: 'var(--green)', hint: 'Handoff prioritario a asesor' },
  B: { label: 'Templado', color: 'var(--gold)', hint: 'Nutrir y calificar más' },
  C: { label: 'Frío', color: 'var(--blue)', hint: 'Seguir informando' },
  D: { label: 'Descartado', color: 'var(--red)', hint: 'Gate: fuera de perfil' },
}
