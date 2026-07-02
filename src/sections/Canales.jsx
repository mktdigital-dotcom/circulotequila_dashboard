import { Head, ChannelsCard } from './panelParts.jsx'

// Sección 3 · Rendimiento por canal.
export default function Canales({ live }) {
  return (
    <section>
      <Head
        eyebrow="Rendimiento por canal"
        title="Qué canal trae"
        gold="clientes."
        sub="No solo quién trae volumen: qué fuente genera prospectos de calidad, medida por su tier."
      />
      <div className="stack">
        <ChannelsCard live={live} />
      </div>
    </section>
  )
}
