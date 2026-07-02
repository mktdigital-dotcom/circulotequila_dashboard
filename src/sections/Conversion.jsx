import { Head, HandoffCard } from './panelParts.jsx'
import { FollowupList } from './Seguimientos.jsx'

// Sección 4 · Conversión comercial (handoff + seguimiento/reactivación).
export default function Conversion({ live, board = [], query = '' }) {
  return (
    <section>
      <Head
        eyebrow="Conversión comercial"
        title="Qué pasó"
        gold="después."
        sub="Lo que ocurrió tras el handoff: ganadas, en proceso, perdidas y su seguimiento — para que nada se pierda de vista después de transferir a ventas."
      />
      <div className="stack" style={{ marginBottom: 26 }}>
        <HandoffCard live={live} />
      </div>
      <div className="loss__title" style={{ marginBottom: 12 }}>Seguimiento y reactivación</div>
      <FollowupList board={board} query={query} />
    </section>
  )
}
