# Deploy · Círculo Tequila Dashboard

## URL de producción
**https://circulotequila-dashboard.vercel.app/**

Hospedado en Vercel. Se despliega solo al hacer push a `main`.

## Endpoints útiles (verificación / diagnóstico)
- `…/api/nocodb?diag=1` → autotest de conexión a NocoDB (sin revelar el token):
  detecta el token, prueba xc-token y Bearer, y reporta `conexionOk`.
- `…/api/nocodb?resource=leads` → leads reales (tabla Leads).
- `…/api/nocodb?resource=signals` → mensajes (tabla Mensajes).
- `…/api/nocodb?resource=notas` → notas compartidas (tabla Notas). Si la tabla
  aún no existe, responde `{ list: [], nota: 'tabla Notas no creada' }`.

## Variables de entorno en Vercel
- `NOCODB_TOKEN` — token de NocoDB (obligatorio).
- `NOCODB_HOST` — por defecto `https://n8n-nocodb.pzqn6b.easypanel.host` (opcional).
- `NOCODB_NOTAS_TABLE` — opcional; id de la tabla Notas si no se quiere resolver
  por nombre.
- (Marketing API, cuando se conecte) `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, etc.

> Nota: la tabla Notas se resuelve por nombre ("Nota" o "Notas") en la base
> `ppqrrdcbc6zxi9h`, así que no hace falta copiar su id.
