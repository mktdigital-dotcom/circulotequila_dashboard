import { Head, LiveKpis, Funnel, funnelStagesFor, ChannelsCard, HandoffCard } from './panelParts.jsx'
import { FollowupList } from './Seguimientos.jsx'

// Página principal · Resumen del embudo (una sola vista con todo lo esencial:
// KPIs + embudo + rendimiento por canal + conversión comercial + seguimiento).
export default function Embudo({ live, board = [], query = '', period = 'mes' }) {
  const f = funnelStagesFor(live, period)
  return (
    <section>
      <Head
        eyebrow="Resumen del embudo"
        title="El proceso comercial,"
        gold="en vivo."
        sub="De marketing a ventas, en una vista: cuántos leads entran, en qué etapa están, qué canal los trae y qué pasó tras el handoff — con la data real de NocoDB."
      />
      <div className="stack">
        <LiveKpis live={live} />

        <div className="card card--pad-lg">
          <div className="card__head">
            <span className="card__tag">Pregunta 1{f.showLeak ? ' · ejemplo' : ' · datos reales'}</span>
            <span className="card__q">Cuántos generamos, cuántos calificaron, cuántos llegaron a ventas</span>
          </div>
          <Funnel stages={f.stages} showLeak={f.showLeak} />
        </div>

        <div className="grid grid--2">
          <ChannelsCard live={live} />
          <HandoffCard live={live} />
        </div>

        <div>
          <div className="loss__title" style={{ margin: '4px 0 14px' }}>Seguimiento y reactivación</div>
          <FollowupList board={board} query={query} />
        </div>
      </div>
    </section>
  )
}
