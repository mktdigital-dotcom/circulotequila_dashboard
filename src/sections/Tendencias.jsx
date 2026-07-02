import { Head, TrendsCard } from './panelParts.jsx'

// Sección 5 · Tendencias y análisis.
export default function Tendencias({ live }) {
  return (
    <section>
      <Head
        eyebrow="Tendencias y análisis"
        title="Qué está"
        gold="cambiando."
        sub="La evolución en el tiempo: leads captados por semana y dónde se forman los cuellos de botella del proceso."
      />
      <div className="stack">
        <TrendsCard live={live} />
      </div>
    </section>
  )
}
