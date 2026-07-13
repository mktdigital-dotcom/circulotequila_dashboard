import { useState } from 'react'
import { useMetaAds } from '../data/meta.js'
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

function Tile({ label, value, accent }) {
  return (
    <div className="lk-tile">
      <div className="lk-num" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="lk-lbl">{label}</div>
    </div>
  )
}

export default function Anuncios() {
  const [range, setRange] = useState('30d')
  const { data, loading, error } = useMetaAds(range)
  const total = data?.total

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
          </div>
        )}
      </div>

      {data?.anuncios?.length > 0 && (
        <div className="card card--pad-lg" style={{ marginTop: 18 }}>
          <div className="card__head">
            <span className="card__title">§ por anuncio · {data.cuenta}</span>
          </div>
          <div className="ads-table-wrap">
            <table className="ads-table">
              <thead>
                <tr>
                  <th>Anuncio</th>
                  <th>Campaña</th>
                  <th className="r">Gasto</th>
                  <th className="r">Mensajes</th>
                  <th className="r">Costo/msg</th>
                  <th className="r">Alcance</th>
                  <th className="r">Clics</th>
                  <th className="r">CTR</th>
                </tr>
              </thead>
              <tbody>
                {data.anuncios.map((a) => (
                  <tr key={a.adId}>
                    <td>{a.anuncio}</td>
                    <td className="muted">{a.campana || '—'}</td>
                    <td className="r">{fmtMoney(a.gasto)}</td>
                    <td className="r">{fmtNum(a.mensajes)}</td>
                    <td className="r">{fmtMoney(a.cpl)}</td>
                    <td className="r">{fmtNum(a.alcance)}</td>
                    <td className="r">{fmtNum(a.clics)}</td>
                    <td className="r">{a.ctr != null ? Number(a.ctr).toFixed(2) + '%' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="bar__meta" style={{ marginTop: 14, marginLeft: 0 }}>
            "Mensajes" = conversaciones de WhatsApp iniciadas desde el anuncio (leads). El costo por
            mensaje es tu costo por lead real de cada anuncio.
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
