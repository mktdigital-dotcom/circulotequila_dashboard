import { useState } from 'react'
import { useMetaAds } from '../data/meta.js'
import { matchLeadsConMetaAds, matchCiudadesConMetaAds } from '../data/live.js'
import { Head } from './panelParts.jsx'

const RANGOS = [
  { k: '7d', label: '7 días' },
  { k: '30d', label: '30 días' },
  { k: '90d', label: '90 días' },
  { k: 'max', label: 'Máximo' },
]

const fmtMoney = (n) =>
  n == null ? '—' : '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('es-MX'))

const ESTADO_LABEL = {
  ACTIVE: 'Activo',
  historico: 'Histórico / no activo',
  desconocido: 'Sin dato',
}
function EstadoBadge({ estado }) {
  const color = estado === 'ACTIVE' ? 'var(--green)' : estado === 'desconocido' ? 'var(--muted)' : 'var(--red)'
  return <span style={{ color, fontWeight: 600, fontSize: 12 }}>{ESTADO_LABEL[estado] || estado}</span>
}

function Tile({ label, value, accent }) {
  return (
    <div className="lk-tile">
      <div className="lk-num" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="lk-lbl">{label}</div>
    </div>
  )
}

export default function Anuncios({ live }) {
  const [range, setRange] = useState('30d')
  const { data, loading, error } = useMetaAds(range)
  const total = data?.total
  const cruce = data?.anuncios ? matchLeadsConMetaAds(live?.leads, data.anuncios) : null
  const filasCruce = cruce ? Object.fromEntries(cruce.filas.map((f) => [f.adId, f])) : {}
  const cruceCiudad = data?.anuncios ? matchCiudadesConMetaAds(live?.leads, data.anuncios) : null
  // Activos primero (lo que importa para decidir hoy), luego el histórico por gasto.
  const anunciosOrdenados = data?.anuncios
    ? [...data.anuncios].sort((a, b) => (b.activo === a.activo ? (b.gasto || 0) - (a.gasto || 0) : b.activo ? 1 : -1))
    : []

  return (
    <section>
      <Head
        eyebrow="Meta Marketing API · en vivo"
        title="Anuncios —"
        gold="rendimiento en Meta"
        sub="Gasto, alcance y mensajes de tus campañas de Meta, directo desde la cuenta publicitaria."
      />

      <div className="card card--pad-lg">
        <div className="card__head">
          <span className="card__tag">
            <span className="dot-live" style={error ? { background: 'var(--red)' } : undefined} /> Meta Ads
          </span>
          <div className="ads-ranges">
            {RANGOS.map((r) => (
              <button
                key={r.k}
                className={'ads-range' + (range === r.k ? ' is-active' : '')}
                onClick={() => setRange(r.k)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="ads-error">
            No se pudieron traer los números de Meta: {error}
          </div>
        )}
        {loading && !data && <div className="muted" style={{ fontSize: 13 }}>Consultando Meta…</div>}

        {total && (
          <div className="lk-grid" style={{ marginTop: 6 }}>
            <Tile label="gasto total" value={fmtMoney(total.gasto)} accent="var(--gold)" />
            <Tile label="mensajes (leads)" value={fmtNum(total.mensajes)} accent="var(--green)" />
            <Tile label="costo por mensaje" value={fmtMoney(total.cpl)} accent="var(--teal)" />
            <Tile label="alcance" value={fmtNum(total.alcance)} />
            <Tile label="clics" value={fmtNum(total.clics)} />
            <Tile label="anuncios" value={fmtNum(total.anuncios)} />
            <Tile label="activos ahora" value={fmtNum(total.activos)} accent="var(--green)" />
          </div>
        )}
      </div>

      {cruceCiudad && (
        <div className="card card--pad-lg" style={{ marginTop: 18 }}>
          <div className="card__head">
            <span className="card__title">§ rendimiento real por ciudad</span>
          </div>
          <p className="bar__meta" style={{ marginTop: 0, marginLeft: 0, marginBottom: 12 }}>
            Ciudad = la que detecta el agente por la frase de apertura (§04 del manual operativo) o la que
            confirma el lead cuando se le pregunta directo. Se cruza contra qué campaña/conjunto de Meta
            menciona esa ciudad por nombre — no depende del ad_id del referral de WhatsApp.
            {cruceCiudad.totalLeads > 0 && (
              <> {cruceCiudad.leadsSinCiudadReconocida} de {cruceCiudad.totalLeads} leads sin ciudad de las 4 conocidas (GDL/CDMX/Riviera Maya/SLP) — quedan fuera de este cruce.</>
            )}
          </p>
          <div className="ads-table-wrap">
            <table className="ads-table">
              <thead>
                <tr>
                  <th>Ciudad</th>
                  <th className="r">Campañas de Meta que la mencionan</th>
                  <th className="r">Gasto real</th>
                  <th className="r">Leads reales</th>
                  <th className="r">Tier A</th>
                  <th className="r">Costo/lead real</th>
                </tr>
              </thead>
              <tbody>
                {cruceCiudad.filas.map((f) => (
                  <tr key={f.ciudad}>
                    <td>{f.ciudad}</td>
                    <td className="r muted" title={f.anuncios.join(', ') || 'sin campaña detectada con ese nombre'}>{f.numAnuncios}</td>
                    <td className="r">{fmtMoney(f.gasto)}</td>
                    <td className="r">{fmtNum(f.leadsReales)}</td>
                    <td className="r">{fmtNum(f.tierA)}</td>
                    <td className="r">{f.cplReal != null ? fmtMoney(f.cplReal) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.anuncios?.length > 0 && (
        <div className="card card--pad-lg" style={{ marginTop: 18 }}>
          <div className="card__head">
            <span className="card__title">§ por anuncio · {data.cuenta}</span>
          </div>
          {cruce && (
            <p className="bar__meta" style={{ marginTop: 0, marginLeft: 0, marginBottom: 12 }}>
              Cruce con leads reales de NocoDB por ad_id:{' '}
              {cruce.cobertura.pct == null
                ? 'sin leads con anuncio detectado todavía.'
                : `${cruce.cobertura.leadsMatcheados} de ${cruce.cobertura.leadsConAnuncio} leads con anuncio detectado hacen match (${cruce.cobertura.pct}%). El resto quedó sin ad_id real guardado — issue abierto en KAIZEN para JP.`}
            </p>
          )}
          <div className="ads-table-wrap">
            <table className="ads-table">
              <thead>
                <tr>
                  <th>Anuncio</th>
                  <th>Estado</th>
                  <th>Campaña</th>
                  <th className="r">Gasto</th>
                  <th className="r">Mensajes (Meta)</th>
                  <th className="r">Leads reales</th>
                  <th className="r">Tier A</th>
                  <th className="r">Costo/lead real</th>
                  <th className="r">Alcance</th>
                  <th className="r">Clics</th>
                  <th className="r">CTR</th>
                </tr>
              </thead>
              <tbody>
                {anunciosOrdenados.map((a) => {
                  const f = filasCruce[a.adId]
                  return (
                    <tr key={a.adId}>
                      <td>{a.anuncio}</td>
                      <td><EstadoBadge estado={a.estado} /></td>
                      <td className="muted">{a.campana || '—'}</td>
                      <td className="r">{fmtMoney(a.gasto)}</td>
                      <td className="r">{fmtNum(a.mensajes)}</td>
                      <td className="r">{f ? fmtNum(f.leadsReales) : '—'}</td>
                      <td className="r">{f ? fmtNum(f.tierA) : '—'}</td>
                      <td className="r">{f?.cplReal != null ? fmtMoney(f.cplReal) : '—'}</td>
                      <td className="r">{fmtNum(a.alcance)}</td>
                      <td className="r">{fmtNum(a.clics)}</td>
                      <td className="r">{a.ctr != null ? Number(a.ctr).toFixed(2) + '%' : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="bar__meta" style={{ marginTop: 14, marginLeft: 0 }}>
            "Mensajes (Meta)" = conversaciones iniciadas que reporta Meta. "Leads reales" = leads que sí
            llegaron a NocoDB con el ad_id de este anuncio — son números distintos a propósito: Meta
            cuenta inicios de conversación, NocoDB cuenta leads que además contestaron. "Costo/lead real"
            divide el gasto del anuncio entre esos leads reales, no entre los mensajes que reporta Meta.
          </p>
        </div>
      )}

      {data && !loading && (data.anuncios?.length ?? 0) === 0 && !error && (
        <div className="card card--pad-lg" style={{ marginTop: 18 }}>
          <div className="muted" style={{ fontSize: 13 }}>
            La cuenta respondió, pero no hay datos de anuncios en este periodo. Prueba otro rango o
            confirma que la cuenta tenga anuncios con entrega.
          </div>
        </div>
      )}
    </section>
  )
}
