# Dividy

Divide los gastos de un grupo y descubre quién le debe cuánto a quién, con números que cuadran al peso.

> **Estado:** en reconstrucción. Es un MVP: solo CLP y datos guardados en tu navegador. Ver el [plan](docs/PLAN.md).

## Cómo funciona

1. Creas un **grupo** (un viaje, un asado, la casa) con sus miembros.
2. Registras **gastos**: quién pagó, cuánto y entre quiénes se divide.
3. Dividy calcula el **saldo** de cada persona, propone las **transferencias** mínimas para quedar a mano, y te deja marcarlas como pagadas o copiar un resumen para el chat.

## Instalable y sin conexión

Dividy es una PWA: en el celular o el computador puedes instalarla desde el navegador ("Agregar a la pantalla de inicio" / "Instalar Dividy"). Tras abrirla una vez con internet, funciona sin conexión: la app se guarda en el dispositivo y tus datos nunca salen de él. Cuando hay una versión nueva, un aviso te ofrece recargar.

Al eliminar un gasto, un pago o un miembro sin movimientos, un aviso de 6 segundos te deja **Deshacer**. Si tu navegador lo permite, **Compartir resumen** abre el menú de compartir del sistema; si no, se copia al portapapeles.

## Desarrollo

Requisitos: Node.js 22 o superior (fijado en `.nvmrc`; Netlify lo toma de `netlify.toml`).

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
```

| Script                          | Qué hace                                   |
| ------------------------------- | ------------------------------------------ |
| `npm run dev`                   | Servidor de desarrollo                     |
| `npm run build`                 | Typecheck + build de producción en `dist/` |
| `npm run preview`               | Sirve el build (con service worker)        |
| `npm run typecheck`             | Solo TypeScript                            |
| `npm test`                      | Tests unitarios y de componentes (Vitest)  |
| `npm run test:watch`            | Vitest en modo watch                       |
| `npm run test:coverage`         | Tests con reporte de cobertura             |
| `npm run test:e2e`              | Tests end-to-end (Playwright)              |
| `npm run lint`                  | ESLint                                     |
| `npm run format` / `format:fix` | Prettier                                   |

Los E2E incluyen una auditoría de accesibilidad con axe y una prueba del modo sin conexión. Los íconos de la PWA se regeneran con `node scripts/generate-icons.mjs` (necesita Playwright y su Chromium).

Para los E2E, la primera vez ejecuta `npx playwright install chromium`. Si ya tienes un Chromium instalado, apunta a él con `PW_CHROMIUM_PATH=/ruta/a/chrome`.

## Documentación

- [`CONTEXT.md`](CONTEXT.md): vocabulario del dominio (grupo, gasto, saldo, pago…). Úsalo para nombrar cosas.
- [`docs/architecture.md`](docs/architecture.md): capas, carpetas y flujo de datos.
- [`docs/testing.md`](docs/testing.md): estrategia de tests.
- [`docs/adr/`](docs/adr): decisiones de arquitectura y su porqué.
- [`docs/PLAN.md`](docs/PLAN.md): fases de la reconstrucción y registro de decisiones.

## Stack

React, TypeScript, Vite (con vite-plugin-pwa), Tailwind CSS, shadcn/ui, TanStack Query, React Router, React Hook Form + Zod, Vitest, Playwright + axe-core. Se despliega en Netlify.
