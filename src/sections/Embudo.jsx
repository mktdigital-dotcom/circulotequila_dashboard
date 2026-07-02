import { Head, LiveKpis, Funnel, funnelStagesFor } from './panelParts.jsx'

// Sección 1 · Resumen general del embudo.
export default function Embudo({ live, period = 'mes' }) {
  const f = funnelStagesFor(live, period)
  return (
    <section>
      <Head
        eyebrow="Resumen del embudo"
        title="Una sola"
        gold="verdad."
        sub="Cuántos leads entran, en qué etapa están y cuántos llegaron a ventas — la fotografía del embudo, en vivo desde NocoDB."
      />
      <div className="stack">
        <LiveKpis live={live} />
        <div className="card card--pad-lg">
          <div className="card__head">
            <span className="card__tag">Pregunta 1</span>
            <span className="card__q">Cuántos generamos, cuántos calificaron, cuántos llegaron a ventas</span>
          </div>
          <Funnel stages={f.stages} showLeak={f.showLeak} />
        </div>
      </div>
    </section>
  )
}
