# El Más Guay del Mundo

Un ranking en el que pagar 1 € te pone en el puesto número 1, con tu foto, tu nombre y tu enlace, hasta que otra persona paga. Idea original de Jesús Chusi Martín (IA Pro, [www.iapro.top](https://www.iapro.top)).

- **Web:** Next.js 16 (App Router) en Vercel.
- **Datos:** Supabase (Postgres y Storage para las fotos). Toda la lectura y escritura pasa por el servidor con la clave `service_role`; el público no tiene acceso directo.
- **Pagos:** Stripe Checkout (tarjeta, Apple Pay, Google Pay).
- **IA:** Claude revisa el nombre, el enlace y la foto antes del pago.

## Cómo funciona una coronación

1. La persona elige nombre (máx. 30 caracteres), foto o avatar y enlace.
2. `POST /api/submit`: comprobaciones de forma, límite por IP, filtro rápido de palabras y revisión con IA (también de la foto). Si no pasa, no se cobra nada.
3. `POST /api/checkout` abre Stripe con 1 coronación (1 €) o el Pack pique (5 €: una ahora y 4 guardadas).
4. Stripe avisa a `/api/stripe/webhook` y la persona sube al nº 1. Si el aviso se retrasa, la web lo comprueba sola al volver del pago.
5. Coronar es idempotente: un aviso repetido no corona dos veces.
6. Las coronaciones guardadas del pack se usan con `POST /api/credit`, sin pasar por Stripe.

El perfil de cada persona se reconoce por una clave que guarda su navegador (en la base de datos solo está su huella). Desde otro navegador se empieza un perfil nuevo.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto (región Europa, por ejemplo Frankfurt).
2. En **SQL Editor**, pega y ejecuta `supabase/migrations/0001_init.sql` una sola vez. Crea las tablas, las funciones y la carpeta pública `fotos` de Storage.
3. Copia de **Project Settings → API** la URL del proyecto y la clave `service_role`.

### 2. Vercel

Importa el repositorio y añade estas variables de entorno (ver `.env.example`):

| Variable | Qué es |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://elmasguay.com` |
| `SUPABASE_URL` | URL del proyecto de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` de Supabase |
| `ANTHROPIC_API_KEY` | Clave de la API de Claude |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (`sk_live_…`, o `sk_test_…` para probar) |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe (`whsec_…`) |
| `RATE_LIMIT_SALT` | Opcional: texto aleatorio para anonimizar IPs |

### 3. Stripe

En **Desarrolladores → Webhooks**, crea un endpoint `https://elmasguay.com/api/stripe/webhook` con los eventos:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`

Copia su secreto en `STRIPE_WEBHOOK_SECRET`.

### 4. Dominio

En Vercel, añade `elmasguay.com` y `www.elmasguay.com` al proyecto y copia los registros DNS que indique en Hostinger (zona DNS del dominio).

## Cosas que se cambian a mano

- `src/lib/site.ts`: nombre de la web y datos legales del titular (`LEGAL`).
- `src/lib/pricing.ts`: precios.
- `src/lib/validation.ts`: los 12 avatares y el filtro rápido de palabras.
- `src/lib/ai.ts`: normas de la revisión con IA.
- **Borrar un perfil** (si alguien lo pide o incumple las normas): en Supabase → Table Editor → `players`, borra su fila. Desaparece del ranking al momento y su navegador lo olvida solo.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y rellénalo
npm run dev
npm test        # pruebas de validación, precios y tiempos
npm run lint    # comprobación de tipos
```

`STRIPE_API_BASE` (opcional, solo en local) apunta Stripe a un simulador para probar pagos sin conexión.
