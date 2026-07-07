# Estrategia de atribución de leads · Círculo Tequila

> Documento de estrategia. Explica **por qué** conectamos el dashboard con Meta,
> **cómo** debe quedar configurado Meta Business para CTWA, qué **App** hay que
> crear en Meta Developers, y **qué variables** se cargan en Vercel para que el
> código las use. La parte técnica fina vive en el código; aquí está el plan.

---

## 1. El problema que resolvemos

Hoy sabemos que un lead entró por WhatsApp, pero **no de qué anuncio vino ni
cuánto costó traerlo**. Sin eso, no se puede decidir presupuesto: no sabemos qué
campaña trae clientes buenos y cuál solo quema dinero.

La meta: que **cada lead quede guardado en la base con su origen real** (campaña,
anuncio, ciudad, línea) y que el dashboard lo **cruce con los anuncios activos de
Meta** para mostrar costo por lead y calidad por anuncio. Todo desde el dashboard,
**con código, sin depender de n8n** para esta parte.

---

## 2. La estrategia: tres capas que se refuerzan

Pensamos la atribución como un semáforo de confianza. Cada capa cubre lo que la
anterior no alcanza, y **conviven sin pelearse** gracias a una regla de precedencia.

| Capa | Qué hace | Confianza | Depende de |
|---|---|---|---|
| **1 · Palabra clave (frase de apertura)** | La frase inicial del mensaje identifica campaña/ciudad/línea. Se guarda SIEMPRE. | Media (heurística) | Nada — funciona hoy |
| **2 · Marketing API (match con anuncios activos)** | El dashboard trae los anuncios vivos de Meta (gasto, clics, CPL) y los casa con el lead según lo detectado. | Media-alta | App de Meta + token en Vercel |
| **3 · CTWA (`ctwa_clid`)** | El clic nativo trae el `ad_id` exacto: el match deja de ser "por parecido" y pasa a "por id". | Alta (exacta) | Config de Meta Business (SOP) |

**Regla de oro de la atribución** (para que las tres convivan):

```
fuente_atribucion:   ctwa (exacta)  >  frase (heurística)  >  ninguna
```

Nunca una capa de menor confianza pisa a una de mayor. Si Meta aún no está
conectado, el sistema **degrada con gracia**: sigues teniendo la campaña por frase;
solo te falta el gasto real. En cuanto conectas Meta, aparece el costo. En cuanto
montas CTWA, el match se vuelve exacto.

---

## 3. Por qué desde el dashboard con código (y no n8n)

El dashboard ya tiene un **cordón seguro** hacia NocoDB: el token vive en Vercel,
el navegador nunca lo ve, y una función serverless (`/api/nocodb`) hace de
intermediario. Hacemos **exactamente lo mismo hacia Meta**: una segunda función
serverless (`/api/meta`) que usa las credenciales guardadas en Vercel para hablar
con la Marketing API. Ventajas:

- **El token nunca se expone** al navegador (no hay CORS ni fugas).
- **Una sola arquitectura**: el dashboard consume `/api/nocodb` y `/api/meta` igual.
- **Sin dependencia de n8n** para leer anuncios — el dashboard pregunta directo.

n8n sigue siendo responsable de **escribir el lead** en NocoDB (la captura). Meta
Marketing API es solo **lectura** de anuncios, y eso lo hace el dashboard.

---

## 4. Cómo debe quedar configurado Meta Business para CTWA

CTWA (Click-to-WhatsApp) es la capa 3, la que da el `ad_id` exacto. Es un **extra**:
no bloquea arrancar, pero es la forma durable. La mayoría de los bloqueos vienen de
un **orden de montaje incorrecto**, no de una falla técnica. La regla de oro:

> **UN solo Business Manager con TODO adentro**, el Facebook admin con permiso de
> anuncios, el número conectado LIMPIO por ManyChat (no por la app de WhatsApp), y
> anuncios CTWA **nativos** (Mensajería → WhatsApp, no `wa.me`).

### Configuración correcta (checklist)
- [ ] **UN** Business Manager que contenga: la **Página** de Facebook + la **Cuenta
      de anuncios** + el **WhatsApp**. (No en Business distintos.)
- [ ] El **Facebook que conecta ManyChat** es **admin** del Business y tiene acceso
      de anuncios sobre esa cuenta (rol Administrar campañas / Admin).
- [ ] El **número** se conecta **LIMPIO por ManyChat** (embedded signup oficial),
      con ese mismo Facebook admin y el mismo Business. **No** ponerlo primero en la
      app de WhatsApp Business del celular.
- [ ] Los anuncios son **CTWA nativos**: objetivo compatible, ubicación de
      conversión → *Aplicaciones de mensajería → WhatsApp*, CTA "Enviar mensaje de
      WhatsApp". **No** anuncios de Tráfico a un link `wa.me` (esos no generan
      `ctwa_clid`).
- [ ] El anuncio está **ACTIVO / entregando** (ManyChat solo muestra anuncios vivos).

### El GATE que decide todo
En ManyChat → Automation → trigger **"El usuario hace clic en un anuncio CTWA"**:
si la **cuenta de anuncios aparece** en el desplegable, el 90% del riesgo se acabó.
Si **no aparece**, algo de la config de arriba quedó mal (Business distinto o el
Facebook de ManyChat sin permiso de anuncios) — hay que arreglarlo **antes** de
seguir. Ahí se agrega `Set Custom Field → ctwa_clid` (+ `ad_id`) y se publica En Vivo.

### Verificación
Clic real desde un número nuevo → el campo `ctwa_clid` **se llena** (no queda null).
Si se llenó, la atribución exacta funciona.

> Los pasos de permisos/OAuth de Facebook los hace **la dueña con SU Facebook**
> (si los hace el implementador desde otro dispositivo, Facebook bloquea el login).

### Plan B (si CTWA nativo no es posible)
Texto pre-llenado único por anuncio (la frase de apertura de la Capa 1) — captura a
la mayoría, se pierde solo si borran el texto. Es justo lo que ya tenemos hoy.

---

## 5. Crear la App en Meta Developers (para la Marketing API)

Para que el dashboard lea los anuncios, hace falta una **App** en
[developers.facebook.com](https://developers.facebook.com) con acceso a la
**Marketing API** ([documentación](https://developers.facebook.com/documentation/ads-commerce/marketing-api)).
Pasos (los hace la dueña / admin del Business):

1. **Crear la App**: developers.facebook.com → Mis Apps → Crear app → tipo
   *Empresa / Business*. Asociarla al **mismo Business Manager** de los anuncios.
2. **Agregar el producto "Marketing API"** dentro de la App.
3. **Generar un Access Token** con permisos de lectura de anuncios:
   `ads_read` (y `ads_management` si luego se quiere más). Para producción conviene
   un **token de larga duración** (o token de usuario de sistema del Business, que
   no caduca) — un token corto se vence y hay que renovarlo.
4. Anotar: **App ID**, **Access Token**, **Ad Account** (`act_...`) y **Business ID**.

> Guardar estos valores en un lugar seguro (Supabase / gestor de secretos). **Nunca
> en el repositorio ni en el chat.** De ahí se copian a Vercel (siguiente sección).

---

## 6. Qué hay que hacer en Vercel (el requisito para prender)

El código lee las credenciales desde **variables de entorno** en Vercel (igual que
`NOCODB_TOKEN`). La dueña las carga en:

**Vercel → el proyecto → Settings → Environment Variables**

Con **estos nombres exactos** (así el código las encuentra):

| Variable | Valor | Obligatoria |
|---|---|---|
| `META_ACCESS_TOKEN` | El token de larga duración de la App | **Sí** |
| `META_AD_ACCOUNT_ID` | La cuenta de anuncios, ej. `act_637824170121322` | **Sí** |
| `META_APP_ID` | El App ID de la App de Meta Developers | Recomendada |
| `META_BUSINESS_ID` | El Business ID | Opcional |
| `META_API_VERSION` | Versión del API, ej. `v21.0` (default si se omite) | Opcional |

Después de guardarlas: **Redeploy** del proyecto para que tomen efecto. En cuanto
existan, la vista de anuncios del dashboard prende sola.

> Seguridad: si el token se pegó alguna vez en un chat o mensaje, **regenerarlo**
> antes de subirlo a Vercel. El token vive solo en Vercel; el navegador nunca lo ve.

---

## 7. Cómo el código usa esos accesos (para que quede claro qué pasa detrás)

- Una función serverless **`/api/meta`** (mismo patrón que `/api/nocodb`) lee las
  variables de arriba desde el entorno de Vercel — nunca del navegador.
- Con `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` consulta la Marketing API y trae
  los **anuncios activos** con su gasto, clics y costo por lead.
- El dashboard muestra esos anuncios y los **cruza con los leads de NocoDB**: une el
  lead (que ya trae su campaña detectada por frase / `ctwa_clid`) con el anuncio vivo
  de Meta → **costo por lead y calidad por anuncio**.
- Si las variables no existen, el dashboard **no truena**: simplemente no muestra la
  capa de Meta y sigue con la atribución por frase (degradación con gracia).

---

## 8. Resumen ejecutable

**Lo que la dueña hace (una vez):**
1. Config de Meta Business para CTWA (§4) — opcional pero recomendado.
2. Crear la App en Meta Developers + token de larga duración (§5).
3. Cargar las variables en Vercel (§6) y redeploy.

**Lo que el sistema hace solo (después):**
- Guarda cada lead completo con su origen (campaña/anuncio por palabra clave).
- Lee los anuncios activos de Meta desde el dashboard.
- Cruza lead ↔ anuncio → costo y calidad por campaña, en vivo.

**El resultado:** una sola pantalla que responde *"¿qué anuncio me trae clientes
buenos y a qué costo?"* — que es la decisión de presupuesto que importa.
