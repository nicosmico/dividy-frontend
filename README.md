# Dividy

Divide los gastos de un grupo y descubre quién le debe cuánto a quién, con números que cuadran al peso.

> **Estado:** en reconstrucción. Es un MVP: solo CLP y datos guardados en tu navegador. Ver el [plan](docs/PLAN.md).

## Cómo funciona

1. Creas un **grupo** (un viaje, un asado, la casa) con sus miembros.
2. Registras **gastos**: quién pagó, cuánto y entre quiénes se divide.
3. Dividy calcula el **saldo** de cada persona, propone las **transferencias** mínimas para quedar a mano, y te deja marcarlas como pagadas o copiar un resumen para el chat.

## Desarrollo

Requisitos: Node.js 22 o superior.

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build de producción en `dist/` |
| `npm run preview` | Sirve el build |
| `npm run typecheck` | Solo TypeScript |
| `npm test` | Tests unitarios y de componentes (Vitest) |
| `npm run test:e2e` | Tests end-to-end (Playwright) |
| `npm run lint` | ESLint |
| `npm run format` / `format:fix` | Prettier |

## Documentación

- [`CONTEXT.md`](CONTEXT.md): vocabulario del dominio (grupo, gasto, saldo, pago…). Úsalo para nombrar cosas.
- [`docs/architecture.md`](docs/architecture.md): capas, carpetas y flujo de datos.
- [`docs/testing.md`](docs/testing.md): estrategia de tests.
- [`docs/adr/`](docs/adr): decisiones de arquitectura y su porqué.
- [`docs/PLAN.md`](docs/PLAN.md): fases de la reconstrucción y registro de decisiones.

## Stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Router, React Hook Form + Zod, Vitest, Playwright. Se despliega en Netlify.
