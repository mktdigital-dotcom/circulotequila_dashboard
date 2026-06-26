# Círculo · Panel

**Una sola verdad. De marketing a ventas.**

Panel de trazabilidad de leads para **Círculo Tequila** — del primer toque hasta el
cierre, sin perseguir hojas de cálculo. Construido a partir del formulario de
onboarding de Kenia Torres: responde sus *tres preguntas del lunes 8:00 a.m.* y
ataca el punto ciego de hoy (qué pasa con un lead **después** de transferirlo a
comercial).

> Estética premium oscura — oro y teal contenidos en las esquinas, el contenido
> sobre negro profundo. React + Vite, gráficas SVG hechas a mano, sin
> dependencias de terceros para visualización.

## Secciones

| # | Sección | Qué hace |
|---|---------|----------|
| 01 | **Panel** | Las 3 preguntas del lunes 8 a.m.: cuántos se generaron / calificaron / llegaron a ventas (embudo), qué pasó tras el *handoff*, qué canales generan **clientes**, y tendencias a 6 semanas. |
| 02 | **Leads** | *Pipeline vivo* — el tablero **es la trazabilidad real**: las 10 etapas del proceso en dos zonas (marketing 1–4 · comercial 5–10) con la compuerta en medio. Arrastra una tarjeta entre etapas y el pipeline se recalcula y **persiste** (localStorage). **Toca un lead** para abrir, **editar** y **anotar** su *contexto que viaja*: etapa, valor, etiquetas, propósito, fecha objetivo, volumen, presupuesto, afinidad, promesa, objeción, próxima acción, checklist de la compuerta y línea de tiempo. Cosas como “cotización” o “reactivación” son **etiquetas** del lead, no etapas. |
| 03 | **Agente IA** | *No inventa: deriva* — **simulador de chat** contra el SOP. Responde con catálogo y precios reales; ante una regla dura (descuento, zona no servida, pedido < mínimo) sella el *handoff* con motivo y timestamp. Incluye pruebas de riesgo y bitácora de handoffs. |
| 04 | **Seguimientos** | La cola de reactivación — evita que conversaciones con interés real se enfríen (≈60% de los que no avanzan son recuperables), del más frío al más reciente, con el mensaje listo para copiar. |
| 05 | **Arquitectura** | El documento de **arquitectura comercial** (azxion · v.2026.06) hecho navegable: las 3 fugas, el modelo de 4 canales, el mapa de 10 etapas con la compuerta MQL→SQL, criterios de calificación, cadencia de reactivación, taxonomías de objeciones y pérdida, las 3 preguntas del lunes, el spec del dashboard y los 6 principios. |

## Correr en local

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # genera dist/
npm run preview  # sirve el build de producción
```

Requiere Node 18+.

## Desplegar (Vercel)

El proyecto es un sitio estático de Vite — Vercel lo detecta automáticamente:

- **Build command:** `npm run build`
- **Output directory:** `dist`

También funciona en cualquier hosting estático (GitHub Pages, Netlify, etc.).

## Los datos

Toda la información vive en **`src/data/circulo.js`** — embudo, canales, leads,
motivos de pérdida, tendencias, reglas y guiones del agente. Las cifras son una
**muestra realista** coherente con el formulario de onboarding (≈50–60 leads/mes,
Meta aporta volumen, los referidos convierten mejor, y la fuga de visibilidad
tras el handoff). Para conectar datos reales de WhatsApp / Google Sheets, basta
reemplazar las estructuras de ese archivo — la interfaz no cambia.

## Funciona

- **Barra superior contextual** — el placeholder de búsqueda, el indicador
  (`datos en vivo` / `sync: wa.api` / `modelo: en_vivo`) y el botón de acción
  (`Exportar` / `+ Nuevo lead` / `Cargar SOP`) cambian según la sección.
- **⌘K / Ctrl+K** enfoca la búsqueda; filtra leads y seguimientos en vivo.
- **Leads**: arrastra tarjetas entre columnas → el pipeline se recalcula y
  persiste; `+ Nuevo lead` agrega una tarjeta a *Nuevo*; exporta a CSV.
- **Agente IA**: escribe o usa una prueba de riesgo → el agente responde con el
  SOP y registra los handoffs.
- **Panel**: el selector **Hoy / Semana / Mes** recalcula el embudo.

## Stack

- React 18 + Vite 5
- CSS puro (sistema de diseño en `src/styles/global.css`)
- Gráficas SVG propias (`src/components/Charts.jsx`) — cero librerías de charting
