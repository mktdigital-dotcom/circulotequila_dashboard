// Gráficas SVG hechas a mano — sin dependencias, control total del estilo.

function buildPath(data, w, h, pad = 6) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const stepX = (w - pad * 2) / (data.length - 1)
  const pts = data.map((v, i) => {
    const x = pad + i * stepX
    const y = h - pad - ((v - min) / span) * (h - pad * 2)
    return [x, y]
  })
  // curva suave (Catmull-Rom -> Bézier)
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`
  }
  return { d, pts }
}

// Línea grande con relleno degradado y punto luminoso al final
export function TrendLine({ data, color = '#e6b35a', height = 170 }) {
  const w = 520
  const h = height
  const { d, pts } = buildPath(data, w, h, 14)
  const last = pts[pts.length - 1]
  const area = `${d} L ${last[0]} ${h} L ${pts[0][0]} ${h} Z`
  const id = 'tg-' + color.replace('#', '')
  return (
    <svg className="trend-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* punto luminoso de núcleo blanco — el detalle de firma */}
      <circle cx={last[0]} cy={last[1]} r="13" fill={color} opacity="0.16" />
      <circle cx={last[0]} cy={last[1]} r="7" fill={color} opacity="0.55" />
      <circle cx={last[0]} cy={last[1]} r="4.2" fill="#fff" />
    </svg>
  )
}

// Sparkline compacto para tarjetas de métrica
export function Sparkline({ data, color = '#e6b35a', width = 130, height = 40 }) {
  const { d, pts } = buildPath(data, width, height, 4)
  const last = pts[pts.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  )
}
