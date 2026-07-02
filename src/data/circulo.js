// ─────────────────────────────────────────────────────────────────────────
// CÍRCULO TEQUILA · fuente única — mkt + ventas
// Todo el contenido proviene del formulario de onboarding de Kenia Torres.
// Las cifras son una muestra realista, coherente con lo declarado en el form
// (≈50–60 leads/mes, Meta trae volumen, los referidos traen clientes, y la
// "caja negra" tras la transferencia a comercial). Reemplazables con datos
// reales de WhatsApp / Google Sheets sin tocar la interfaz.
// ─────────────────────────────────────────────────────────────────────────

export const brand = {
  name: 'CÍRCULO',
  sub: 'TEQUILA',
  tagline: 'ultra premium · jalisco',
  edition: 'UNA EDICIÓN DE',
  ref: 'circulo-tequila-dp3u',
  source: 'fuente única · mkt + ventas',
  geo: '20.67°N 103.35°W · jalisco',
  norte: 'norte: día_45',
  contacto: {
    responsable: 'Kenia Torres',
    email: 'mktdigital@circulotequila.com',
    whatsapp: '+52 384 118 2580',
  },
}

// ── Embudo por periodo ──────────────────────────────────────────────────
// dot: color del punto · leak marca la fuga narrativa principal (post-handoff)
export const periods = {
  hoy: {
    label: 'Hoy',
    revenue: 0,
    ticket: 0,
    metaPct: 12,
    globalPct: 0,
    stages: [
      { key: 'gen', label: 'Generados', value: 4, dot: 'blue', sub: 'leads de hoy', note: '+1 vs ayer' },
      { key: 'conv', label: 'En conversación', value: 3, dot: 'teal', sub: 'respondió al 1er toque', note: 'IA · <2 min' },
      { key: 'cal', label: 'Calificados', value: 1, dot: 'gold', sub: 'listos para venta', note: 'calidad 0.74' },
      { key: 'sales', label: 'Enviados a ventas', value: 1, dot: 'pink', sub: 'transferidos a comercial', note: 'handoff sellado' },
      { key: 'won', label: 'Cerradas', value: 0, dot: 'green', sub: 'ventas', note: 'pipeline activo' },
    ],
  },
  semana: {
    label: 'Semana',
    revenue: 46200,
    ticket: 46200,
    metaPct: 12,
    globalPct: 7.1,
    stages: [
      { key: 'gen', label: 'Generados', value: 14, dot: 'blue', sub: 'leads del periodo', note: '+2 vs sem. previa' },
      { key: 'conv', label: 'En conversación', value: 10, dot: 'teal', sub: 'respondió al 1er toque', note: 'IA · <2 min' },
      { key: 'cal', label: 'Calificados', value: 6, dot: 'gold', sub: 'listos para venta', note: 'calidad 0.72' },
      { key: 'sales', label: 'Enviados a ventas', value: 2, dot: 'pink', sub: 'transferidos a comercial', note: 'handoff sellado' },
      { key: 'won', label: 'Cerradas', value: 1, dot: 'green', sub: '$46.2k · ventas', note: 'meta 12%' },
    ],
  },
  mes: {
    label: 'Mes',
    revenue: 138600,
    ticket: 46200,
    metaPct: 12,
    globalPct: 5.4,
    stages: [
      { key: 'gen', label: 'Generados', value: 56, dot: 'blue', sub: 'leads del periodo', note: '+9 vs mes previo' },
      { key: 'conv', label: 'En conversación', value: 41, dot: 'teal', sub: 'respondió al 1er toque', note: 'IA · <2 min' },
      { key: 'cal', label: 'Calificados', value: 22, dot: 'gold', sub: 'listos para venta', note: 'calidad 0.72' },
      { key: 'sales', label: 'Enviados a ventas', value: 9, dot: 'pink', sub: 'transferidos a comercial', note: 'handoff sellado' },
      { key: 'won', label: 'Cerradas', value: 3, dot: 'green', sub: '$138.6k · ventas', note: 'global 5.4% · meta 12%' },
    ],
  },
}

// La transición donde se pierde la visibilidad: enviados → cerradas.
export const leakIndex = 3 // marca el paso "Enviados → Cerradas" como caja negra

// ── Pregunta 3 · canales que generan CLIENTES (no solo conversaciones) ────
export const channels = [
  { name: 'Referidos', leads: 2, quality: 'alta', pct: 33, tone: 'green' },
  { name: 'Eventos / Expos', leads: 2, quality: 'alta', pct: 28, tone: 'teal' },
  { name: 'Sitio web', leads: 6, quality: 'media', pct: 12, tone: 'gold' },
  { name: 'Meta Ads · WhatsApp', leads: 46, quality: 'media', pct: 6, tone: 'golddim' },
  { name: 'Mailing', leads: 1, quality: 'baja', pct: 4, tone: 'orange' },
]
export const channelsCaption = 'Meta trae volumen; los referidos y eventos traen los clientes.'

// ── Pregunta 2 · qué pasó tras el handoff (cohorte del mes) ───────────────
export const handoff = {
  total: 9,
  segments: [
    { label: 'Ganadas', value: 3, tone: 'green' },
    { label: 'Abiertas / en proceso', value: 4, tone: 'gold' },
    { label: 'Perdidas', value: 2, tone: 'red' },
  ],
  closeDays: 14,
  closeNote: 'nada se pierde de vista',
}

// Motivos de pérdida — ventana de 90 días (su pregunta sin dato hoy).
export const lossReasons = [
  { reason: 'Sin respuesta / falta de seguimiento', value: 5 },
  { reason: 'Precio / presupuesto', value: 4 },
  { reason: 'Tiempo de decisión', value: 3 },
  { reason: 'Volumen bajo / mínimo 12', value: 2 },
  { reason: 'Zona / fuera de alcance', value: 1 },
]

// ── Tendencias · 6 semanas ────────────────────────────────────────────────
export const trends = {
  weekLabels: ['s24', 's25', 's26', 's27', 's28', 'hoy'],
  series: {
    leads: { label: 'Leads generados', data: [9, 11, 10, 13, 12, 14], unit: '' },
    conversion: { label: 'Conversión global', data: [2.3, 3.0, 3.6, 4.2, 4.8, 5.4], unit: '%' },
    calidad: { label: 'Calidad de lead', data: [0.61, 0.63, 0.66, 0.68, 0.7, 0.72], unit: '' },
    sinMovimiento: { label: 'Tiempo sin movimiento', data: [5.8, 5.2, 5.0, 4.9, 4.6, 4.4], unit: ' d' },
    cierre: { label: 'Tiempo de cierre', data: [16, 16, 15, 15, 14, 14], unit: ' d' },
  },
  highlights: [
    { label: 'Conversión global', delta: '+3.1 pts', dir: 'up' },
    { label: 'Tiempo sin movimiento', delta: '−1.4 días', dir: 'up' },
    { label: 'Calidad de lead', delta: '0.61 → 0.72', dir: 'up' },
  ],
}

// ── Etapas del embudo (las 10 de Kenia + reactivación) ────────────────────
export const stages = [
  { n: 1, key: 'nuevo', label: 'Lead nuevo', signal: 'Responde al primer mensaje o interactúa con la información.' },
  { n: 2, key: 'conversacion', label: 'En conversación', signal: 'Hace preguntas, pide más información o comparte detalles del proyecto.' },
  { n: 3, key: 'calificado', label: 'Calificado', signal: 'Comparte empresa, objetivo, cantidad estimada, ciudad o fecha.' },
  { n: 4, key: 'interesado', label: 'Interesado', signal: 'Pide avanzar, conocer el proceso, propuesta o hablar con un asesor.' },
  { n: 5, key: 'transferido', label: 'Transferido a vendedor', signal: 'El vendedor valida el proyecto y presenta la propuesta.' },
  { n: 6, key: 'propuesta', label: 'Propuesta aprobada', signal: 'El cliente acepta condiciones y confirma intención de compra.' },
  { n: 7, key: 'anticipo', label: 'Anticipo recibido', signal: 'Se confirma el pago del 50% de anticipo.' },
  { n: 8, key: 'brief', label: 'Brief completado', signal: 'El cliente entrega la información para personalizar.' },
  { n: 9, key: 'diseno', label: 'Diseño autorizado', signal: 'El cliente aprueba el arte final.' },
  { n: 10, key: 'produccion', label: 'Producción y entrega', signal: 'Pedido producido, entregado y cerrado administrativamente.' },
]
export const reactivationStage = {
  key: 'reactivacion',
  label: 'Reactivación',
  signal: 'Dejó de responder; permanece en seguimiento hasta retomar o descartar.',
}

// ── Jardín de leads · estado real de cada oportunidad ─────────────────────
// stage = número de etapa (1–10) o 'reactivacion'
export const leads = [
  { id: 'CT-118', nombre: 'Mariana Ortega', empresa: 'Grupo Hotelero Maya Resorts', canal: 'Referidos', ciudad: 'Riviera Maya', stage: 7, responsable: 'Ricardo · ventas', ultima: 'hace 1 día', dias: 1, proximo: 'Enviar brief de personalización', botellas: 60, formato: '750 ml', proposito: 'Amenidad VIP huéspedes', valor: 135000 },
  { id: 'CT-117', nombre: 'Daniela Ríos', empresa: 'Banco Aurum · RH', canal: 'Sitio web', ciudad: 'CDMX', stage: 3, responsable: 'Kenia · mkt', ultima: 'hace 5 horas', dias: 0, proximo: 'Confirmar cantidad y fecha objetivo', botellas: 100, formato: '750 ml', proposito: 'Reconocimientos fin de año', valor: 225000 },
  { id: 'CT-116', nombre: 'Andrea Cano', empresa: 'Grupo Restaurantero Sal de Mar', canal: 'Eventos / Expos', ciudad: 'Puerto Vallarta', stage: 8, responsable: 'Ricardo · ventas', ultima: 'hace 6 horas', dias: 0, proximo: 'Diseño desarrolla arte final', botellas: 36, formato: '750 ml', proposito: 'Regalo a clientes clave', valor: 81000 },
  { id: 'CT-115', nombre: 'Pablo Sáenz', empresa: 'Inmobiliaria Cumbre', canal: 'Referidos', ciudad: 'Querétaro', stage: 6, responsable: 'Ricardo · ventas', ultima: 'hace 1 día', dias: 1, proximo: 'Solicitar anticipo del 50%', botellas: 50, formato: '750 ml', proposito: 'Inauguración torre', valor: 112500 },
  { id: 'CT-114', nombre: 'Sofía Llamas', empresa: 'Hotel Casa Origen', canal: 'Meta Ads · WhatsApp', ciudad: 'San Miguel de Allende', stage: 4, responsable: 'Kenia · mkt', ultima: 'hace 1 día', dias: 1, proximo: 'Agendar llamada con asesor comercial', botellas: 48, formato: '375 ml', proposito: 'Amenidad en habitaciones', valor: 76800 },
  { id: 'CT-113', nombre: 'Carlos Méndez', empresa: 'Constructora Vértice', canal: 'Meta Ads · WhatsApp', ciudad: 'Guadalajara', stage: 5, responsable: 'Ricardo · ventas', ultima: 'hace 3 días', dias: 3, proximo: 'Vendedor debe presentar propuesta', botellas: 24, formato: '750 ml', proposito: 'Regalo corporativo fin de año', valor: 54000 },
  { id: 'CT-112', nombre: 'Verónica Salas', empresa: 'Distribuidora del Bajío', canal: 'Sitio web', ciudad: 'León', stage: 3, responsable: 'Kenia · mkt', ultima: 'hace 4 días', dias: 4, proximo: 'Falta fecha objetivo y presupuesto', botellas: 120, formato: 'mixto', proposito: 'Reventa premium', valor: 270000 },
  { id: 'CT-111', nombre: 'Compras · Duty Free', empresa: 'Aeropuerto GDL Duty Free', canal: 'Eventos / Expos', ciudad: 'Guadalajara', stage: 5, responsable: 'Ricardo · ventas', ultima: 'hace 7 días', dias: 7, proximo: '⚠ Sin respuesta del vendedor — dar seguimiento', botellas: 200, formato: '750 ml', proposito: 'Punto de venta turístico', valor: 450000 },
  { id: 'CT-110', nombre: 'Jorge Paredes', empresa: 'Paredes & Asociados', canal: 'Meta Ads · WhatsApp', ciudad: 'Guadalajara', stage: 2, responsable: 'Kenia · mkt', ultima: 'hace 2 días', dias: 2, proximo: 'Compartir precios y pedido mínimo', botellas: 12, formato: '375 ml', proposito: 'Regalo a clientes', valor: 19200 },
  { id: 'CT-109', nombre: 'Marcela Vidal', empresa: 'Eventos Vidal', canal: 'Meta Ads · WhatsApp', ciudad: 'CDMX', stage: 1, responsable: 'Kenia · mkt', ultima: 'hace 2 horas', dias: 0, proximo: 'Primer toque (IA enviado)', botellas: null, formato: '—', proposito: 'Boda corporativa', valor: null },
  { id: 'CT-108', nombre: 'Luis Fdo. Beltrán', empresa: 'Tech Solutions MX', canal: 'Meta Ads · WhatsApp', ciudad: 'Monterrey', stage: 'reactivacion', responsable: 'Kenia · mkt', ultima: 'hace 12 días', dias: 12, proximo: 'Reactivar: dejó de responder tras precios', botellas: 24, formato: '750 ml', proposito: 'Evento anual', valor: 54000 },
  { id: 'CT-107', nombre: 'Renata Gil', empresa: 'Spa & Wellness Auria', canal: 'Sitio web', ciudad: 'Riviera Maya', stage: 'reactivacion', responsable: 'Kenia · mkt', ultima: 'hace 18 días', dias: 18, proximo: 'Reactivar: sin movimiento 18 días', botellas: 30, formato: '375 ml', proposito: 'Amenidad spa', valor: 48000 },
]

// ── Agente IA · su manual de operación (de las secciones 05–07 del form) ──
export const agent = {
  intro:
    'El objetivo del agente es entregar al equipo comercial un prospecto calificado, informado e interesado — listo para que un vendedor humano cierre. Mantiene conversaciones naturales, alineadas con la experiencia premium de la marca.',
  canDo: [
    'Compartir precios vigentes de productos, canales y ediciones empresariales.',
    'Explicar productos, presentaciones, personalización, tiempos estimados, pedido mínimo, formas de pago y cobertura.',
    'Recomendar la mejor opción según las necesidades del cliente.',
    'Calificar prospectos: nombre, empresa, cargo, ciudad, volumen, fecha objetivo, presupuesto y propósito.',
    'Proponer y coordinar una llamada o cita con un vendedor.',
    'Comunicar disponibilidad estimada (nunca confirmar inventario sin validación).',
  ],
  cannot: [
    'Prometer descuentos, condiciones especiales o personalizaciones extraordinarias sin autorización.',
    'Confirmar inventario, producción o fechas definitivas sin validación interna.',
    'Compartir enlaces de pago o solicitar pagos.',
    'Garantizar tiempos de entrega o volúmenes disponibles.',
    'Solicitar datos bancarios, contraseñas o información financiera sensible por chat.',
  ],
  escalation: [
    'El prospecto manifiesta intención clara de compra.',
    'Solicita una cotización formal o un proyecto empresarial / hotelero / personalizado.',
    'Pide una llamada, reunión o videollamada.',
    'Solicita descuentos o condiciones fuera de la oferta estándar.',
    'Pide confirmar inventario, disponibilidad o fechas específicas.',
    'Quiere iniciar un pedido o proceso de pago.',
    'El agente no tiene información suficiente para responder con certeza.',
  ],
  values: [
    { title: 'Honestidad y transparencia', body: 'Información real sobre precios, tiempos y alcances. Nunca prometemos lo que no podemos cumplir.' },
    { title: 'Experiencia y atención personalizada', body: 'Entendemos cada necesidad y construimos una propuesta a la medida, sobre todo en proyectos empresariales.' },
    { title: 'Calidad sobre cantidad', body: 'Priorizamos relaciones de largo plazo sobre cierres rápidos. Cada botella representa a Círculo.' },
  ],
  faqs: [
    { q: '¿Qué son las Ediciones Empresariales?', a: 'Botellas de tequila ultra premium 100% agave totalmente personalizadas para empresas, eventos y proyectos especiales. Personalizamos botella, diseño y estuche.' },
    { q: '¿Qué se puede personalizar?', a: 'Desarrollamos un diseño exclusivo a partir de logotipos, colores, mensajes, conceptos o elementos visuales del cliente.' },
    { q: '¿Cuál es el pedido mínimo?', a: 'El pedido mínimo para Ediciones Empresariales es de 12 botellas.' },
    { q: '¿Qué presentaciones manejan para proyectos empresariales?', a: 'Presentación de 375 ml y 750 ml.' },
    { q: '¿Cuáles son los precios de las Ediciones Empresariales?', a: '375 ml: $1,600 MXN por unidad. 750 ml: $2,250 MXN por unidad. Pedido mínimo de 12 botellas.' },
    { q: '¿Cuánto tarda una edición personalizada?', a: 'Una vez autorizado el arte final, el tiempo estimado de entrega es de 20 días hábiles.' },
    { q: '¿Qué tipos de tequila manejan?', a: 'Actualmente contamos con Blanco, Joven y Reposado.' },
    { q: '¿Cuáles son los precios de la línea regular?', a: 'Blanco 375 ml: $1,600. Blanco 750 ml: $2,250. Joven 750 ml: $2,600. Reposado 750 ml: $2,900.' },
    { q: '¿Hacen envíos?', a: 'Sí, atendemos clientes en toda la República Mexicana.' },
    { q: '¿Qué métodos de pago aceptan?', a: 'Transferencia bancaria y Mercado Pago.' },
    { q: '¿Qué se requiere para iniciar un proyecto empresarial?', a: 'Compartir la información de la marca, definir los elementos a personalizar y realizar un anticipo del 50%.' },
    { q: '¿Pueden aplicar descuentos?', a: 'Cualquier descuento o condición especial debe ser revisada y autorizada por el área comercial.' },
    { q: '¿Cómo validan disponibilidad e inventario?', a: 'La disponibilidad y fechas de entrega se validan internamente antes de confirmarse al cliente.' },
    { q: '¿Puedo agendar una llamada o presentación?', a: 'Sí. Coordinamos una llamada para presentar la marca, mostrar ejemplos y resolver dudas del proceso.' },
  ],
  scripts: [
    { n: 1, title: 'Respuesta inicial', body: 'Hola, buen día 👋 ¡Gracias por tu interés en nuestras Ediciones Empresariales de Círculo Tequila! Con gusto te comparto la información para crear un regalo que represente a tu empresa. ¿Con quién tengo el gusto? 😊' },
    { n: 2, title: 'Presentación del producto', body: 'Nuestras Ediciones Empresariales son botellas de tequila ultra premium personalizadas para empresas, reconocimientos, clientes especiales y eventos. Desarrollamos el diseño exclusivo a partir de lo que nos compartas (colores, logotipo, mensajes o conceptos).' },
    { n: 3, title: 'Presentaciones y precios', body: '🔹 375 ml – $1,600 MXN c/u\n🔹 750 ml – $2,250 MXN c/u\n📦 Pedido mínimo: 12 botellas.\nAmbos formatos incluyen personalización completa de botella y estuche.' },
    { n: 4, title: 'Tiempos de entrega', body: 'Una vez autorizado el arte final, el tiempo estimado de entrega es de 20 días hábiles. Para iniciar el proyecto se solicita un anticipo del 50%.' },
    { n: 5, title: 'Calificación del prospecto', body: 'Para ayudarte mejor, ¿me platicas del proyecto? 📅 ¿Es para un evento, cliente o reconocimiento? 🍾 ¿Cuántas botellas consideras? 📍 ¿En qué ciudad está tu empresa?' },
    { n: 6, title: 'Seguimiento / reactivación', body: 'Hola 👋, nos encantaría saber qué te pareció la información sobre nuestras Ediciones Empresariales ✨ Podemos agendar una llamada para mostrarte ejemplos personalizados y resolver dudas. ¿Coordinamos una llamada esta semana?' },
  ],
  materials: 'https://drive.google.com/drive/folders/1SdL50ixHMrApGKn2vMDO-stMZtToRGFj?usp=sharing',
}

// ── Precios oficiales (reglas que el agente no puede romper) ──────────────
export const pricing = {
  linea: [
    { producto: 'Blanco', ml: '375 ml', precio: 1600 },
    { producto: 'Blanco', ml: '750 ml', precio: 2250 },
    { producto: 'Joven', ml: '750 ml', precio: 2600 },
    { producto: 'Reposado', ml: '750 ml', precio: 2900 },
  ],
  empresarial: [
    { producto: 'Personalizada', ml: '375 ml', precio: 1600 },
    { producto: 'Personalizada', ml: '750 ml', precio: 2250 },
  ],
  reglas: [
    'Pedido mínimo de 12 botellas en Ediciones Empresariales.',
    'Anticipo del 50% para iniciar producción y personalización.',
    'Descuentos, excepciones y condiciones especiales: autoriza Jefa Comercial o Director.',
    'Entrega estimada: 20 días hábiles tras autorizar el arte final.',
    'Pagos: transferencia bancaria y Mercado Pago. Cobertura: toda la República.',
  ],
}

// ── Las 3 preguntas del lunes 8:00 a.m. ───────────────────────────────────
export const mondayQuestions = [
  '¿Cuántos generamos, cuántos calificaron, cuántos llegaron a ventas?',
  'Qué pasó tras el handoff',
  'Qué canales generan clientes',
]

// ── Navegación ────────────────────────────────────────────────────────────
// Secciones que pide el negocio (brief §11), en su orden, + Agente IA y la
// referencia de Arquitectura. `live` marca las que se alimentan de NocoDB.
export const nav = [
  { n: '01', key: 'embudo', label: 'Resumen del embudo', live: true },
  { n: '02', key: 'leads', label: 'Seguimiento y estado', live: true },
  { n: '03', key: 'canales', label: 'Rendimiento por canal', live: true },
  { n: '04', key: 'conversion', label: 'Conversión comercial', live: true },
  { n: '05', key: 'tendencias', label: 'Tendencias y análisis', live: true },
  { n: '06', key: 'agente', label: 'Agente IA', live: true },
  { n: '07', key: 'arquitectura', label: 'Arquitectura' },
]

export const peso = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

// Formato compacto para tarjetas y badges: 225000 → $225k · 1240000 → $1.24M
export const pesoCompact = (n) => {
  if (n == null) return '—'
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'k'
  return '$' + n
}

// ── Leads · pipeline vivo ─────────────────────────────────────────────────
// El pipeline ES el Mapa de proceso aplicado (§04): las 10 etapas, en dos
// zonas (marketing 1-4 · comercial 5-10) con la compuerta entre la 4 y la 5.
// Las etapas viven en `stages` + `reactivationStage`. Cosas como
// "cotización", "llamada" o "reactivación" NO son etapas: son etiquetas (tags)
// que viajan en cada lead.

// Acentos por etapa (frío → cálido: marketing → comercial).
export const stageAccents = {
  1: '#6aa6dd', 2: '#4ccaa0', 3: '#5cc88f', 4: '#7fce7a', 5: '#d8c265',
  6: '#e9b65d', 7: '#e8a955', 8: '#e49a4f', 9: '#e08b4a', 10: '#dc7a45',
}

export const kanbanCards = [
  { id: 'L-04', stage: 1, name: 'Iván Robles', ciudad: 'Tonalá', bot: '12 bot', ocasion: 'cumpleaños', value: 19200, tags: ['retail'] },
  { id: 'L-02', stage: 2, name: 'Rocío Mendívil', ciudad: 'Zapopan', bot: '24 bot', ocasion: 'regalo corporativo', value: 54000, tags: ['preguntó costo'] },
  { id: 'L-03', stage: 2, name: 'Bar La Cantera', ciudad: 'Tlaquepaque', bot: '40 bot', ocasion: 'reventa', value: 90000, tags: ['reventa'] },
  { id: 'L-07', stage: 2, name: 'Tienda Sur', ciudad: 'Colima', bot: '80 bot', ocasion: 'reventa mayoreo', value: 180000, tags: ['mayoreo', 'preguntó costo'] },
  { id: 'L-12', stage: 3, name: 'Rest. Maguey', ciudad: 'Tequila', bot: '40 bot', ocasion: 'carta de bebidas', value: 104000, tags: ['pidió ficha'] },
  { id: 'L-01', stage: 4, name: 'Hacienda Soltera', ciudad: 'Guadalajara', bot: '100 bot', ocasion: 'boda · sep', value: 225000, tags: ['pidió ejemplos'] },
  { id: 'L-05', stage: 4, name: 'Marisol Vega', ciudad: 'Guadalajara', bot: '20 bot', ocasion: 'aniversario', value: 45000, tags: ['cotización'] },
  { id: 'L-06', stage: 4, name: 'Don Beto', ciudad: 'Chapala', bot: '60 bot', ocasion: 'boda · 8 mesas', value: 135000, tags: ['cotización', 'tiempos'] },
  { id: 'L-09', stage: 4, name: 'Grupo Ágave', ciudad: 'Guadalajara', bot: '40 bot', ocasion: 'evento empresa', value: 90000, tags: ['espera compras'] },
  { id: 'L-11', stage: 4, name: 'Fernanda Lozano', ciudad: 'Guadalajara', bot: '20 bot', ocasion: 'reconocimientos', value: 45000, tags: ['reactivación'] },
  { id: 'L-08', stage: 5, name: 'Lucía Ramírez', ciudad: 'Zapopan', bot: '24 bot', ocasion: 'reposado · regalo', value: 69600, tags: ['cotización'] },
  { id: 'L-13', stage: 5, name: 'Hotel Real', ciudad: 'Guadalajara', bot: '120 bot', ocasion: 'amenidad VIP', value: 270000, tags: ['llamada', 'orden de compra'] },
  { id: 'L-10', stage: 6, name: 'Pablo Cortés', ciudad: 'Puerto Vallarta', bot: '12 bot', ocasion: 'cena privada', value: 27000, tags: ['propuesta'] },
  { id: 'L-14', stage: 10, name: 'Evento San Luis', ciudad: 'San Luis Potosí', bot: '120 bot', ocasion: 'joven · evento', value: 312000, tags: ['entregado ✓'] },
]

// ── Contexto que viaja · por lead (Arquitectura §08) ──────────────────────
// Cada oportunidad lleva un bloque que se regenera tras cada interacción:
// qué pidió, qué objetó, qué se le prometió y qué espera. El handoff deja de
// empezar de cero. Se indexa por id de lead para sobrevivir al tablero.
export const leadContext = {
  'L-01': {
    linea: 'empresarial', empresa: 'Hacienda Soltera', cargo: 'Coordinación de eventos', authority: 'decisor',
    volumen: 100, proposito: 'Botella de regalo para boda', fechaObjetivo: '2026-09-12', budget: 'estimado', icpFit: 88,
    canalPreferido: 'whatsapp', stakeholders: ['eventos', 'dirección'],
    ultimaPromesa: 'Enviar ejemplos de personalización para boda', promesaStatus: 'pendiente',
    objecion: 'timing_evento', nextAction: 'Compartir casos + confirmar fecha de arte', touches: 1,
    events: [
      { t: 'hace 6 d', e: 'Lead capturado · referido' },
      { t: 'hace 6 d', e: 'Primer toque del agente · <2 min' },
      { t: 'hace 4 d', e: 'Calificado · empresa + volumen + propósito' },
      { t: 'hace 1 d', e: 'Solicitó ejemplos de personalización' },
    ],
  },
  'L-02': {
    linea: 'empresarial', empresa: 'Rocío Mendívil · Corp.', cargo: 'Gerente de marketing', authority: 'influencer',
    volumen: 24, proposito: 'Regalo corporativo fin de año', fechaObjetivo: '2026-12-05', budget: 'desconocido', icpFit: 72,
    canalPreferido: 'whatsapp', stakeholders: ['marketing'],
    ultimaPromesa: 'Mandar lista de precios de ediciones', promesaStatus: 'cumplida',
    objecion: null, nextAction: 'Confirmar volumen y propósito exacto', touches: 0,
    events: [
      { t: 'hace 2 d', e: 'Lead capturado · Meta Ads' },
      { t: 'hace 2 d', e: 'Primer toque del agente' },
      { t: 'hace 1 d', e: 'Pidió precios de ediciones' },
    ],
  },
  'L-03': {
    linea: 'retail', empresa: 'Bar La Cantera', cargo: 'Propietario', authority: 'decisor',
    volumen: 40, proposito: 'Reventa en barra', fechaObjetivo: null, budget: 'desconocido', icpFit: 54,
    canalPreferido: 'whatsapp', stakeholders: [],
    ultimaPromesa: 'Explicar esquema de reventa', promesaStatus: 'pendiente',
    objecion: 'vs_otro_tequila', nextAction: 'Validar si es retail o mayoreo', touches: 0,
    events: [
      { t: 'hace 1 d', e: 'Lead capturado · Meta Ads' },
      { t: 'hace 1 d', e: 'Primer toque del agente' },
    ],
  },
  'L-04': {
    linea: 'retail', empresa: 'Iván Robles', cargo: 'Consumidor final', authority: 'decisor',
    volumen: 12, proposito: 'Regalo de cumpleaños', fechaObjetivo: '2026-07-20', budget: 'confirmado', icpFit: 48,
    canalPreferido: 'whatsapp', stakeholders: [],
    ultimaPromesa: null, promesaStatus: null,
    objecion: 'minimo_volumen', nextAction: 'Ofrecer línea regular o 12 personalizadas', touches: 0,
    events: [
      { t: 'hace 2 h', e: 'Lead capturado · web' },
      { t: 'hace 2 h', e: 'Primer toque del agente' },
    ],
  },
  'L-05': {
    linea: 'empresarial', empresa: 'Marisol Vega S.A.', cargo: 'Relaciones públicas', authority: 'influencer',
    volumen: 20, proposito: 'Aniversario de empresa', fechaObjetivo: '2026-10-01', budget: 'estimado', icpFit: 76,
    canalPreferido: 'whatsapp', stakeholders: ['rr.pp.', 'compras'],
    ultimaPromesa: 'Cotización formal de 20 botellas', promesaStatus: 'pendiente',
    objecion: 'precio_premium', nextAction: 'Enviar cotización + reframe a valor', touches: 1,
    events: [
      { t: 'hace 5 d', e: 'Lead capturado · Meta Ads' },
      { t: 'hace 5 d', e: 'Calificado · empresa + propósito' },
      { t: 'hace 2 d', e: 'Preguntó costo de 20 botellas' },
    ],
  },
  'L-06': {
    linea: 'empresarial', empresa: 'Eventos Don Beto', cargo: 'Organizador', authority: 'decisor',
    volumen: 60, proposito: 'Boda · 8 mesas premium', fechaObjetivo: '2026-11-15', budget: 'estimado', icpFit: 81,
    canalPreferido: 'whatsapp', stakeholders: ['novios'],
    ultimaPromesa: 'Propuesta con presentación 750ml', promesaStatus: 'pendiente',
    objecion: 'tiempos_personalizacion', nextAction: 'Explicar calendario de arte vs. fecha', touches: 1,
    events: [
      { t: 'hace 6 d', e: 'Lead capturado · referido' },
      { t: 'hace 4 d', e: 'Calificado · volumen + fecha' },
      { t: 'hace 2 d', e: 'Preguntó costo y tiempos' },
    ],
  },
  'L-07': {
    linea: 'retail', empresa: 'Tienda Sur', cargo: 'Comprador', authority: 'decisor',
    volumen: 80, proposito: 'Reventa mayoreo punto turístico', fechaObjetivo: null, budget: 'estimado', icpFit: 66,
    canalPreferido: 'email', stakeholders: ['compras'],
    ultimaPromesa: 'Lista de precios mayoreo', promesaStatus: 'cumplida',
    objecion: 'precio_premium', nextAction: 'Definir rotación esperada y presentación', touches: 0,
    events: [
      { t: 'hace 4 d', e: 'Lead capturado · expo' },
      { t: 'hace 3 d', e: 'Solicitó precios mayoreo' },
    ],
  },
  'L-08': {
    linea: 'empresarial', empresa: 'Lucía Ramírez · Estudio', cargo: 'Dirección', authority: 'decisor',
    volumen: 24, proposito: 'Regalo a clientes clave (Reposado)', fechaObjetivo: '2026-09-30', budget: 'confirmado', icpFit: 90,
    canalPreferido: 'whatsapp', stakeholders: ['dirección'],
    ultimaPromesa: 'Enviar cotización formal Reposado 750ml', promesaStatus: 'pendiente',
    objecion: null, nextAction: 'Cotización + propuesta de arte', touches: 0,
    events: [
      { t: 'hace 8 d', e: 'Lead capturado · referido' },
      { t: 'hace 6 d', e: 'Calificado · empresa + volumen + fecha' },
      { t: 'hace 3 d', e: 'Pidió cotización formal' },
      { t: 'hace 1 d', e: 'Cotización en preparación' },
    ],
  },
  'L-09': {
    linea: 'empresarial', empresa: 'Grupo Ágave', cargo: 'Gerente comercial', authority: 'decisor',
    volumen: 40, proposito: 'Evento de empresa', fechaObjetivo: '2026-10-20', budget: 'estimado', icpFit: 84,
    canalPreferido: 'email', stakeholders: ['comercial', 'compras'],
    ultimaPromesa: 'Propuesta con dos conceptos de arte', promesaStatus: 'pendiente',
    objecion: 'autoridad_compras', nextAction: 'Sumar a compras a la conversación', touches: 1,
    events: [
      { t: 'hace 7 d', e: 'Lead capturado · web' },
      { t: 'hace 5 d', e: 'Calificado · empresa + propósito + volumen' },
      { t: 'hace 2 d', e: 'Solicitó propuesta' },
    ],
  },
  'L-10': {
    linea: 'empresarial', empresa: 'Pablo Cortés', cargo: 'Anfitrión', authority: 'decisor',
    volumen: 12, proposito: 'Cena privada', fechaObjetivo: '2026-08-10', budget: 'confirmado', icpFit: 70,
    canalPreferido: 'whatsapp', stakeholders: [],
    ultimaPromesa: 'Cotización 12 botellas 375ml', promesaStatus: 'cumplida',
    objecion: null, nextAction: 'Confirmar arte y anticipo', touches: 0,
    events: [
      { t: 'hace 5 d', e: 'Lead capturado · Meta Ads' },
      { t: 'hace 4 d', e: 'Calificado' },
      { t: 'hace 3 d', e: 'Transferido a vendedor' },
      { t: 'hace 2 d', e: 'Cotización enviada' },
      { t: 'hace 1 d', e: 'Propuesta aprobada por el cliente' },
    ],
  },
  'L-11': {
    linea: 'empresarial', empresa: 'Fernanda Lozano · Corp.', cargo: 'Compras', authority: 'gatekeeper',
    volumen: 20, proposito: 'Reconocimientos internos', fechaObjetivo: '2026-09-05', budget: 'estimado', icpFit: 64,
    canalPreferido: 'whatsapp', stakeholders: ['rr.hh.', 'dirección'],
    ultimaPromesa: 'Dar tiempo para decisión interna', promesaStatus: 'pendiente',
    objecion: 'autoridad_compras', nextAction: 'Reactivar: ¿sigue siendo prioridad?', touches: 2,
    events: [
      { t: 'hace 12 d', e: 'Lead capturado · Meta Ads' },
      { t: 'hace 10 d', e: 'Calificado' },
      { t: 'hace 6 d', e: 'Pidió tiempo para validar internamente' },
      { t: 'hace 4 d', e: 'Toque de reactivación 02 · sin respuesta' },
    ],
  },
  'L-12': {
    linea: 'turismo', empresa: 'Rest. Maguey', cargo: 'Gerente de A&B', authority: 'decisor',
    volumen: 40, proposito: 'Carta de bebidas premium', fechaObjetivo: null, budget: 'estimado', icpFit: 74,
    canalPreferido: 'whatsapp', stakeholders: ['a&b', 'gerencia'],
    ultimaPromesa: 'Enviar ficha de producto y presentación', promesaStatus: 'pendiente',
    objecion: 'tiempos_personalizacion', nextAction: 'Agendar degustación con gerencia', touches: 1,
    events: [
      { t: 'hace 9 d', e: 'Lead capturado · expo' },
      { t: 'hace 6 d', e: 'Calificado · establecimiento + volumen' },
      { t: 'hace 3 d', e: 'Pidió ficha de producto' },
    ],
  },
  'L-13': {
    linea: 'turismo', empresa: 'Hotel Real', cargo: 'Gerente de compras', authority: 'decisor',
    volumen: 120, proposito: 'Amenidad VIP huéspedes', fechaObjetivo: '2026-12-01', budget: 'confirmado', icpFit: 92,
    canalPreferido: 'email', stakeholders: ['compras', 'experiencia', 'gerencia'],
    ultimaPromesa: 'Agendar llamada con representante comercial', promesaStatus: 'pendiente',
    objecion: null, nextAction: 'Vendedor confirma cita · orden de compra', touches: 0,
    events: [
      { t: 'hace 10 d', e: 'Lead capturado · referido' },
      { t: 'hace 7 d', e: 'Calificado · establecimiento + volumen + ciudad' },
      { t: 'hace 3 d', e: 'Solicitó llamada con asesor' },
      { t: 'hace 1 d', e: 'Handoff a comercial · contexto sellado' },
    ],
  },
  'L-14': {
    linea: 'empresarial', empresa: 'Evento San Luis', cargo: 'Coordinación', authority: 'decisor',
    volumen: 120, proposito: 'Evento corporativo (Joven)', fechaObjetivo: '2026-07-01', budget: 'confirmado', icpFit: 95,
    canalPreferido: 'whatsapp', stakeholders: ['dirección', 'compras'],
    ultimaPromesa: 'Confirmar producción tras anticipo', promesaStatus: 'cumplida',
    objecion: null, nextAction: 'Producción y entrega · cierre administrativo', touches: 0,
    events: [
      { t: 'hace 18 d', e: 'Lead capturado · referido' },
      { t: 'hace 14 d', e: 'Calificado + transferido a comercial' },
      { t: 'hace 9 d', e: 'Propuesta aprobada' },
      { t: 'hace 7 d', e: 'Anticipo 50% recibido' },
      { t: 'hace 5 d', e: 'Brief completado' },
      { t: 'hace 3 d', e: 'Diseño autorizado por el cliente' },
      { t: 'hace 1 d', e: 'En producción · entrega 20 días hábiles' },
    ],
  },
}

// Criterios de la compuerta (empresarial) para medir handoff_completeness
export const gateFields = ['empresa', 'volumen', 'proposito', 'ciudad', 'fechaObjetivo']

// ── Arquitectura comercial (documento azxion · v.2026.06) ─────────────────
export const arquitectura = {
  meta: { version: 'v.2026.06', author: 'azxion', prepared: 'Kenia Torres · Círculo Tequila' },
  sintesis:
    'Círculo tiene un proceso multicanal premium que se ve sano en la superficie. La fuga es estructural y vive en un solo punto: el handoff a ventas, donde el dato deja de existir. La trazabilidad debe ser una propiedad del sistema, no una tarea semanal.',
  fugas: [
    { n: 1, title: 'Respuesta tardía', body: 'Una sola persona atiende; los leads de noche o fin de semana esperan al día hábil. En WhatsApp la conversión cae vertical tras los primeros minutos.' },
    { n: 2, title: 'Transferencia demasiado temprana', body: 'Al abrir el criterio para que ventas entre desde las primeras señales, se diluyó qué es un lead calificado. Ventas recibe oportunidades a medio cocer.' },
    { n: 3, title: 'Sin trazabilidad post-handoff', body: 'Transferida la oportunidad, desaparece del radar: ni estatus ni motivo de pérdida. Es la fuga más cara — y la que el negocio nombró como su dolor principal.' },
  ],
  principios: [
    { n: '01', title: 'Eventos, no estados', body: 'Cada acción se guarda como un evento con su fecha y hora. El estatus se deriva del historial; cada lead es reconstruible.' },
    { n: '02', title: 'Una sola fuente de verdad', body: 'WhatsApp, web, correos y hojas de cálculo dejan de estar separados: todos alimentan un único registro.' },
    { n: '03', title: 'Listas cerradas con escape', body: 'Canal, objeción, motivo de pérdida: listas cerradas con “otro” + texto que va a una cola de revisión.' },
    { n: '04', title: 'Contexto que viaja', body: 'Cada oportunidad lleva un bloque: qué pidió, qué objetó, qué se le prometió y qué espera. La transferencia deja de empezar de cero.' },
    { n: '05', title: 'El agente mide interés, no ventas', body: 'Califica, nutre y agenda. El cierre, el precio especial y el inventario los confirma un humano.' },
    { n: '06', title: 'Aditivo, no destructivo', body: 'Campos y listas se agregan con versión; nunca se reescribe la historia. Crecer no cuesta tirar datos.' },
  ],
  canales: [
    { canal: 'Empresarial', icp: 'Dir./gerente comercial, mkt o RR.PP. que busca regalos corporativos premium', senal: 'Empresa, cargo, volumen (≥12), propósito, fecha', rol: 'Califica a fondo + agenda; nunca compromete arte ni descuento', prioridad: 'alta' },
    { canal: 'Turismo', icp: 'Gerencia / compras / experiencia de hoteles y resorts de alta gama', senal: 'Establecimiento, volumen, modalidad (orden de compra), ciudad', rol: 'Identifica oportunidad y deriva a representante', prioridad: 'alta' },
    { canal: 'Retail', icp: 'Consumidor final y turista que busca regalo o recuerdo premium', senal: 'Presentación, intención de compra, ubicación / punto de venta', rol: 'Informa, recomienda presentación y deriva a punto de venta', prioridad: 'media' },
    { canal: 'Digital / Amazon', icp: 'Comprador digital que busca conveniencia y entrega confiable', senal: 'Producto, presentación, intención de compra directa', rol: 'Informa y orienta al canal de compra', prioridad: 'media-baja' },
  ],
  zonas: [
    {
      zona: 'Marketing', tone: 'teal',
      etapas: [
        { n: 1, label: 'Lead nuevo', senal: 'Responde el primer mensaje o interactúa con la info.' },
        { n: 2, label: 'En conversación', senal: 'Hace preguntas, pide info o comparte detalles del proyecto.' },
        { n: 3, label: 'Calificado', senal: 'Comparte empresa, objetivo, volumen, ciudad o fecha.' },
        { n: 4, label: 'Interesado', senal: 'Pide avanzar, conocer el proceso o hablar con un asesor.' },
      ],
    },
    {
      zona: 'Compuerta · pasa a ventas', tone: 'gold', gate: true,
      etapas: [{ n: '→', label: 'Pasa a ventas', senal: 'Cumple los criterios mínimos del canal. Solo aquí se transfiere a comercial.' }],
    },
    {
      zona: 'Comercial', tone: 'pink',
      etapas: [
        { n: 5, label: 'Transferido a vendedor', senal: 'El vendedor valida el proyecto y presenta propuesta.' },
        { n: 6, label: 'Propuesta aprobada', senal: 'El cliente acepta condiciones y confirma intención.' },
        { n: 7, label: 'Anticipo recibido', senal: 'Se confirma el 50% de anticipo.' },
        { n: 8, label: 'Brief completado', senal: 'El cliente entrega la información para personalizar.' },
        { n: 9, label: 'Diseño autorizado', senal: 'El cliente aprueba el arte final.' },
        { n: 10, label: 'Producción y entrega', senal: 'Pedido producido, entregado y cerrado (20 días hábiles).' },
      ],
    },
  ],
  gate: [
    { criterio: 'Empresa y cargo', campo: 'empresa y cargo', umbral: 'Identifica si es quien decide o quien influye.' },
    { criterio: 'Volumen estimado', campo: 'volumen', umbral: 'Mínimo 12 botellas. Por debajo, sigue en seguimiento.' },
    { criterio: 'Propósito', campo: 'propósito', umbral: 'Evento, reconocimiento, regalo corporativo.' },
    { criterio: 'Ciudad', campo: 'ciudad', umbral: 'Logística y asignación al representante.' },
    { criterio: 'Fecha objetivo', campo: 'fecha objetivo', umbral: 'Contra los 20 días hábiles de entrega.' },
    { criterio: 'Señal de presupuesto', campo: 'presupuesto', umbral: 'Confirmado, estimado o por conocer. Orienta, no frena.' },
  ],
  objeciones: [
    { cat: 'precio_premium', tipica: '“Está caro”', marco: 'Reframe a valor percibido del regalo y a la imagen de marca del cliente.' },
    { cat: 'vs_otro_tequila', tipica: '“Otro tequila cuesta menos”', marco: 'Diferenciar por ultra premium, personalización y experiencia, no por litro.' },
    { cat: 'autoridad_compras', tipica: '“Tengo que consultar con dirección”', marco: 'Mapear el proceso interno y sumar al decisor a la conversación.' },
    { cat: 'timing_evento', tipica: '“Lo dejamos para después del evento”', marco: 'Cuantificar los 20 días hábiles vs. la fecha; crear urgencia real.' },
    { cat: 'minimo_volumen', tipica: '“Quiero menos de 12 botellas”', marco: 'Ofrecer línea regular o explorar fecha futura con volumen.' },
    { cat: 'tiempos_personalizacion', tipica: '“¿Llega a tiempo el arte?”', marco: 'Explicar el proceso de diseño y el calendario contra la fecha objetivo.' },
    { cat: 'desconfianza_marca', tipica: '“No los conozco”', marco: 'Casos, ejemplos de proyectos y prueba social.' },
  ],
  motivosPerdida: [
    'sin_respuesta / falta de seguimiento',
    'precio / presupuesto',
    'timing del evento',
    'volumen bajo (< mínimo 12)',
    'zona no servida',
    'eligió competidor / alternativa',
    'sin decisor / autoridad',
  ],
  cadencia: [
    { toque: '01', gap: '+0 d', contenido: 'Respuesta directa + ejemplos de personalización', meta: 'dar valor' },
    { toque: '02', gap: '+2 d', contenido: 'Recordatorio + caso de un proyecto similar', meta: 'construir confianza' },
    { toque: '03', gap: '+5 d', contenido: 'Pregunta por la fecha del evento / volumen', meta: 'calificar' },
    { toque: '04', gap: '+9 d', contenido: 'Valor puro (sin pedir nada): idea de concepto', meta: 'mantener calor' },
    { toque: '05', gap: '+14 d', contenido: '¿Sigue siendo prioridad para tu evento?', meta: 'pedir decisión' },
    { toque: '06+', gap: '+30/60 d', contenido: 'Reactivación por temporada (fin de año, fechas clave)', meta: 're-engage' },
  ],
  telemetria: [
    { q: '1 · ¿Cuántos generamos, calificaron y llegaron a ventas?', m: 'Volumen por canal · % que pasa a ventas · nº transferidos · % de leads respondidos a tiempo.' },
    { q: '2 · ¿Qué pasó con los transferidos y su estatus?', m: 'Estatus en vivo tras la transferencia · días a cierre · motivos de pérdida · oportunidades estancadas.' },
    { q: '3 · ¿Qué canales generan clientes, no solo conversaciones?', m: 'Conversión a venta por fuente · costo por lead · valor por canal.' },
  ],
  dashboard: [
    { seccion: 'Resumen del embudo', muestra: 'Leads, en conversación, calificados, enviados, abiertos, ganados.', responde: 'pregunta 1' },
    { seccion: 'Seguimiento y estado', muestra: 'Cada lead: responsable, última interacción, tiempo sin movimiento, próximo paso.', responde: 'pregunta 2' },
    { seccion: 'Rendimiento por canal', muestra: 'Meta, web, referidos, mailing, expos: cantidad, calidad y conversión.', responde: 'pregunta 3' },
    { seccion: 'Conversión comercial', muestra: 'Oportunidades transferidas, estatus, motivos de pérdida, ventas y tiempos.', responde: 'pregunta 2' },
    { seccion: 'Tendencias', muestra: 'Comparativos semana/mes, evolución de conversión, cuellos de botella.', responde: 'las tres' },
  ],
}

// ── Agente IA · simulador contra el SOP ───────────────────────────────────
export const agentSim = {
  session: '#4471',
  seed: [
    { who: 'user', text: '¿Cuánto cuesta una botella?', t: '10:02' },
    { who: 'agent', text: '¡Va! Depende de la expresión: Blanco, Joven o Reposado. 750 ml desde $2,250 MXN. Para un evento te conviene caja — rinde mejor y cuidamos el precio por volumen.', t: '10:02' },
    { who: 'user', text: '¿Me das un descuento del 20%?', t: '10:04' },
    { who: 'agent', text: 'Ese ajuste lo ve directo el equipo. Te conecto con Kenia para cerrar el precio. ⊕', t: '10:04', handoff: true },
  ],
  risks: [
    { label: 'Pídele descuento', send: '¿Me das un 20% de descuento?' },
    { label: 'Zona no servida', send: '¿Hacen envíos a Sinaloa?' },
    { label: 'Solo 3 botellas', send: 'Quiero comprar solo 3 botellas' },
    { label: '"Está muy caro"', send: 'Está muy caro, ¿no tienes algo más barato?' },
  ],
  handoffLog: [
    { reason: 'descuento > 10%', t: '10:04' },
    { reason: 'zona no servida (sinaloa)', t: '09:51' },
    { reason: 'pedido < mínimo (3 bot)', t: '09:38' },
  ],
}

// ── Simulador WhatsApp · conexión al flujo real n8n ──────────────────────────
// El webhook responde con { ok:true, respuesta:[{parte},...] }. En desarrollo
// (npm run dev) las llamadas pasan por el proxy de Vite (/n8n → host real) para
// evitar CORS; en producción se llama la URL directa (requiere CORS habilitado
// en el nodo Webhook de n8n).
export const WEBHOOK_URL = 'https://n8n-n8n.pzqn6b.easypanel.host/webhook/circulo-manychat'
export const WEBHOOK_PATH_DEV = '/n8n/webhook/circulo-manychat'

export const simConfig = {
  // Solo estos teléfonos reciben respuesta (gate "Telefonos de prueba" del flujo).
  // Cada número = una sesión de memoria Redis independiente (session_id = mc_<tel>).
  testPhones: [
    { phone: '+5216682217601', label: 'Prueba 1' },
    { phone: '+5216682322911', label: 'Prueba 2' },
    { phone: '+5212345678901', label: 'Prueba 3' },
  ],
  // Frases de apertura de cada campaña — detonan la "Detección de Canal".
  campaigns: [
    { label: 'Web · general', ciudad: 'otro', send: 'Información sobre Círculo Tequila' },
    { label: 'Web · empresarial', ciudad: 'otro', send: 'Información sobre Edición Empresarial' },
    { label: 'Campaña GDL', ciudad: 'GDL', send: 'Quiero información' },
    { label: 'Campaña CDMX', ciudad: 'CDMX', send: 'Me gustaría recibir información' },
    { label: 'Campaña Riviera Maya', ciudad: 'Riviera Maya', send: 'Podrían darme información' },
    { label: 'Campaña SLP', ciudad: 'SLP', send: 'Me encantaría recibir información' },
  ],
  // Pruebas de reglas duras / calificación.
  risks: [
    { label: 'Pide descuento', send: '¿Me dan un 20% de descuento?' },
    { label: 'Pide maquila', send: '¿Hacen maquila de tequila?' },
    { label: 'Solo 3 botellas', send: 'Quiero comprar solo 3 botellas' },
    { label: 'Lead caliente', send: 'Soy director, necesito 100 botellas para un evento en diciembre, ¿podemos agendar una llamada?' },
    { label: '"Está muy caro"', send: 'Está muy caro, ¿no tienen algo más barato?' },
  ],
}
