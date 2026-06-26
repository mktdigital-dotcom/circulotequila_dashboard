import { arquitectura as A } from '../data/circulo.js'

const prio = (p) => (p === 'alta' ? 'tone-green' : p.startsWith('media-baja') ? 'tone-muted' : 'tone-gold')

export default function Arquitectura() {
  return (
    <section>
      <div className="section-head">
        <div>
          <div className="eyebrow">Arquitectura · {A.meta.author} · {A.meta.version}</div>
          <h1 className="headline">
            Trazabilidad de punta a <span className="gold">punta.</span>
          </h1>
          <p className="subhead">{A.sintesis}</p>
        </div>
      </div>

      <div className="stack">
        {/* Las tres fugas */}
        <div>
          <h3 className="section-title">El problema central · tres fugas encadenadas</h3>
          <div className="grid grid--3">
            {A.fugas.map((f) => (
              <div className="card" key={f.n} style={{ borderColor: f.n === 3 ? 'rgba(226,121,92,0.3)' : undefined }}>
                <div className="fuga__n" style={{ color: f.n === 3 ? 'var(--red)' : 'var(--gold)' }}>Fuga {f.n}</div>
                <div className="fuga__t">{f.title}</div>
                <p className="fuga__b">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Modelo de canales */}
        <div className="card">
          <h3 className="section-title">Modelo de canales · cuatro negocios, un sistema</h3>
          <div className="grid grid--2">
            {A.canales.map((c) => (
              <div className="arch-channel" key={c.canal}>
                <div className="arch-channel__head">
                  <span className="arch-channel__name">{c.canal}</span>
                  <span className={'chip ' + prio(c.prioridad)}>{c.prioridad}</span>
                </div>
                <div className="arch-kv"><b>Cliente ideal</b>{c.icp}</div>
                <div className="arch-kv"><b>Señal de calificación</b>{c.senal}</div>
                <div className="arch-kv"><b>Rol del agente</b>{c.rol}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mapa del proceso */}
        <div className="card">
          <h3 className="section-title">Mapa del proceso · 10 etapas, 3 zonas, 1 compuerta</h3>
          <div className="zones">
            {A.zonas.map((z) => (
              <div className={'zone' + (z.gate ? ' zone--gate' : '')} key={z.zona}>
                <div className={'zone__tag tone-' + z.tone}>{z.zona}</div>
                <div className="zone__stages">
                  {z.etapas.map((e) => (
                    <div className="zstage" key={e.n}>
                      <span className={'zstage__n bg-' + z.tone}>{e.n}</span>
                      <div>
                        <div className="zstage__label">{e.label}</div>
                        <div className="zstage__senal">{e.senal}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compuerta */}
        <div className="grid grid--2">
          <div className="card">
            <h3 className="section-title">Compuerta · criterios mínimos (empresarial)</h3>
            <table className="price-table">
              <thead>
                <tr><th>Criterio</th><th>Umbral / nota</th></tr>
              </thead>
              <tbody>
                {A.gate.map((g) => (
                  <tr key={g.criterio}>
                    <td>{g.criterio}<div className="lead-id" style={{ marginTop: 2 }}>{g.campo}</div></td>
                    <td style={{ textAlign: 'left', fontWeight: 400, color: 'var(--muted)' }}>{g.umbral}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3 className="section-title">Cadencia de reactivación · ~60% recuperable</h3>
            <div className="cadencia">
              {A.cadencia.map((c) => (
                <div className="cad-row" key={c.toque}>
                  <span className="cad-toque">{c.toque}</span>
                  <span className="cad-gap">{c.gap}</span>
                  <div className="cad-body">
                    <div>{c.contenido}</div>
                    <span className="cad-meta">{c.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Taxonomías */}
        <div className="card">
          <h3 className="section-title">Objeciones · respuestas tipo</h3>
          <div className="obj-list">
            {A.objeciones.map((o) => (
              <div className="obj-row" key={o.cat}>
                <span className="chip chip--stage">{o.cat}</span>
                <div className="obj-body">
                  <div className="obj-tipica">{o.tipica}</div>
                  <div className="obj-marco">{o.marco}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="loss__title" style={{ marginTop: 22 }}>Motivos de pérdida</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {A.motivosPerdida.map((m) => (
              <span className="chip" key={m}>{m}</span>
            ))}
          </div>
        </div>

        {/* Telemetría + dashboard */}
        <div className="grid grid--2">
          <div className="card">
            <h3 className="section-title">Las 3 preguntas del lunes</h3>
            <div className="stack" style={{ gap: 12 }}>
              {A.telemetria.map((t, i) => (
                <div className="tele" key={i}>
                  <div className="tele__q">{t.q}</div>
                  <div className="tele__m">{t.m}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="section-title">Dashboard · una sola verdad</h3>
            <table className="price-table">
              <thead>
                <tr><th>Sección</th><th>Responde</th></tr>
              </thead>
              <tbody>
                {A.dashboard.map((d) => (
                  <tr key={d.seccion}>
                    <td>{d.seccion}<div className="lead-id" style={{ marginTop: 2, fontFamily: 'inherit', color: 'var(--muted)' }}>{d.muestra}</div></td>
                    <td style={{ textAlign: 'right', color: 'var(--gold)', fontWeight: 500 }}>{d.responde}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Principios */}
        <div className="card">
          <h3 className="section-title">Principios no negociables</h3>
          <div className="grid grid--3">
            {A.principios.map((p) => (
              <div className="value-card" key={p.n}>
                <h4><span className="muted" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.n}</span> {p.title}</h4>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="callout">
          Un sistema comercial bien diseñado no parece sistema. Parece que el equipo simplemente sabe
          qué hacer. La infraestructura es invisible, y por eso funciona. — <b>Principio de cierre</b>
        </div>
      </div>
    </section>
  )
}
