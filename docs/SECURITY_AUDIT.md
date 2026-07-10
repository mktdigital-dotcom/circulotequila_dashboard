# Auditoría de seguridad · Círculo Tequila Dashboard

> Ejecutada con la metodología del SOP (`/cso` · OWASP Top 10 + STRIDE), leyendo
> el código real y verificando cada hallazgo de forma adversarial (solo pasa si
> es explotable con confianza ≥ 8/10). Stack: **React+Vite · Vercel serverless
> (`/api/nocodb`) · NocoDB**. Fecha: 2026-07-09.

Arquitectura de 3 capas (§8): **n8n → NocoDB → dashboard**. Esta auditoría cubre
la capa **dashboard + proxy**. n8n y la base no se modificaron.

---

## Resumen

| # | Severidad | Hallazgo | Estado |
|---|---|---|---|
| 1 | 🔴 CRÍTICO | `/api/nocodb` sin autenticación (lee/escribe toda la base) | Mecanismo corregido · **falta activarlo (dueño)** |
| 2 | 🟠 MEDIO | Fuga de errores crudos de NocoDB al cliente | ✅ Corregido |
| 3 | 🟠 MEDIO | `?diag=1` revelaba infra (host, nombre de var, prefijo/long del token) | ✅ Corregido |
| 4 | 🟡 BAJO | `VITE_NOCODB_TOKEN` aceptado (footgun: Vite lo expone en el bundle) | ✅ Corregido |
| 5 | 🟡 BAJO | Sin cabeceras de seguridad ni restricción de método | ✅ Corregido |
| 6 | 🔵 INFO | Webhook n8n público → costo LLM por abuso | Fuera de alcance (n8n) |

**Positivos verificados:** sin secretos versionados · `.env*` en `.gitignore` ·
el navegador nunca habla directo con la DB (todo por `/api/nocodb`) · sin
`dangerouslySetInnerHTML` (React escapa la salida → XSS bajo) · sin SSRF (host
fijo + recursos en whitelist) · `npm audit` = 0 vulnerabilidades.

---

## 1. 🔴 CRÍTICO · `/api/nocodb` sin autenticación (A01 Broken Access Control + A02 PII)

**Dónde:** `api/nocodb.js` (todo el handler).

**Qué:** el proxy no exigía ninguna sesión ni clave. Cualquiera con la URL podía:
- `GET /api/nocodb?resource=leads` → **toda la tabla de leads**, incluyendo
  `nombre` y `contacto` (teléfonos = **PII**). También `?resource=signals` (todas
  las conversaciones) y `?resource=notas`.
- `PATCH /api/nocodb?resource=leads` con `{Id,…}` → **alterar cualquier lead**
  (etapa, nombre, etc.) → tampering.
- `POST /api/nocodb?resource=notas` → **inyectar notas** en cualquier lead.

**Escenario:** un competidor (o cualquiera) hace `curl` a la URL de producción y
se lleva la lista completa de prospectos con teléfonos, o corrompe el pipeline.
Para un negocio premium B2B, la lista de leads ES el activo.

**Verificación adversarial:** el dashboard es público (se abre sin login), la URL
se comparte, y el código no tenía ningún chequeo de sesión → confirmado, 9/10.
(No aplica Vercel Deployment Protection: la app es accesible sin autenticar.)

**Fix (implementado):** candado **deny-by-default** en el proxy — si existe la
variable `DASHBOARD_TOKEN` en Vercel, TODA petición exige el header `x-app-key`
con ese valor (comparación timing-safe), si no → `401`. El frontend muestra una
pantalla de login que guarda la clave y la manda en cada llamada. Es **inerte**
mientras no se configure la variable (rollout sin lockout), y deny-by-default en
cuanto se activa.

**Acción del dueño (para cerrarlo):**
1. En Vercel → Settings → Environment Variables: crear `DASHBOARD_TOKEN` con una
   clave larga aleatoria. Redeploy. A partir de ahí, el dashboard pide clave.
   *(Alternativa/complemento más fuerte: activar **Vercel Deployment Protection**
   — password o Vercel Authentication — que protege app + API a nivel plataforma.)*
2. Compartir la clave con Kenia por un canal seguro (no por chat público).

---

## 2. 🟠 MEDIO · Fuga de errores crudos al cliente (A05)

**Dónde:** `api/nocodb.js` — respuestas 502 devolvían `detail`/`detalle` con el
cuerpo de error de NocoDB (`txt.slice(0,300)`, `String(e.message)`).

**Qué:** exponía mensajes internos de NocoDB (rutas, ids, versiones) al cliente.

**Fix (implementado):** el detalle se registra con `console.error` en el servidor
(visible en logs de Vercel) y al cliente solo va un mensaje genérico.

---

## 3. 🟠 MEDIO · `?diag=1` revelaba infraestructura (A05)

**Dónde:** `api/nocodb.js`, bloque `diag`.

**Qué:** respondía `host`, `variableUsada` (nombre de la env var), `tokenPrefijo`
(`nc_pat_`), `tokenLongitud` y el `detalle` crudo del error — todo anónimo. Sirve
a un atacante para fingerprintear el stack.

**Fix (implementado):** `diag` ahora solo devuelve booleanos (`tokenDetectado`,
`conexionOk`, `candadoActivo`) y queda **detrás del candado** cuando está activo.

---

## 4. 🟡 BAJO · `VITE_NOCODB_TOKEN` aceptado como nombre de token

**Dónde:** `api/nocodb.js`, `TOKEN_NAMES`.

**Qué:** aceptar un nombre con prefijo `VITE_` invita a guardar el token en una
variable que **Vite inyecta en el bundle del navegador** → token público. Hoy
producción usa `NOCODB_TOKEN` (correcto), pero el código invitaba al error.

**Fix (implementado):** `VITE_NOCODB_TOKEN` eliminado de la lista.

---

## 5. 🟡 BAJO · Cabeceras de seguridad y métodos

**Fix (implementado):** toda respuesta lleva `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`. La rama de lectura
rechaza métodos que no sean `GET/HEAD` con `405`. Con candado activo, los datos
se sirven `private, no-store` (no se cachean en el edge sin la clave).

---

## 6. 🔵 INFO · Webhook n8n público (fuera de alcance)

**Dónde:** `src/data/circulo.js` → `WEBHOOK_URL` (webhook de ManyChat en n8n),
llamado desde el navegador por el simulador.

**Qué:** el webhook es público por diseño (ManyChat) y cada mensaje dispara un
LLM. Sin límite, un abuso genera factura. **No es un secreto** y **no se toca n8n**
en esta auditoría.

**Recomendación al dueño (§10 del SOP):** configurar **límite de gasto** en
OpenRouter/LLM, n8n y ManyChat, y rate-limit en el webhook.

---

## Pendientes de infraestructura / decisión del dueño (§9.6)

- [ ] **Activar `DASHBOARD_TOKEN`** en Vercel (cierra el hallazgo #1). O Vercel
      Deployment Protection.
- [ ] **Rotar credenciales** que se pegaron en chat alguna vez: token de NocoDB,
      `xc-mcp-token`, y el Access Token de Meta. (Rotación §3 del SOP.)
- [ ] Confirmar que el **repo es privado**.
- [ ] **Límites de gasto** en LLM / n8n / ManyChat.
- [ ] (Opcional) Monitoreo de errores (Sentry) y rama `staging` (§11).

---

## Checklist pre-deploy (§13) · estado

- [x] Ningún secreto en código de cliente ni en respuestas de API.
- [x] `.env*` en `.gitignore`.
- [x] El browser no consulta la DB directo (todo por `/api/nocodb`).
- [~] Todo endpoint exige sesión (deny-by-default) — **mecanismo listo; activar `DASHBOARD_TOKEN`**.
- [x] Sin `dangerouslySetInnerHTML`; salida escapada por React.
- [x] `npm audit` sin vulnerabilidades altas.
- [x] `build` en verde.
- [ ] Límites de gasto en servicios de IA (dueño).
- [ ] Rotación de las keys expuestas en chat (dueño).
