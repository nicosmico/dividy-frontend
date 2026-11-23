# Guía para agentes

- Antes de nombrar o modelar algo, lee `CONTEXT.md`. Usa sus términos (Expense, no Bill; Suggested Transfer, no debt).
- La arquitectura y la regla de dependencias están en `docs/architecture.md`. `src/domain` no importa React ni almacenamiento.
- Decisiones ya tomadas: `docs/adr/` y el registro en `docs/PLAN.md`. No las cambies sin escribir un ADR nuevo.
- Dinero: siempre pesos enteros (ADR 0001). Nunca dividas montos fuera de la función de división del dominio.
- Toda lógica de dominio nueva va con tests (tabla de casos y, si aplica, propiedades con fast-check).
- Colores solo vía tokens (`docs/design-system.md`); nunca hex ni paletas fijas de Tailwind en componentes. Íconos: solo Lucide.
- Antes de terminar: `npm run lint && npm run typecheck && npm test && npm run build`.
- Código en inglés; textos de la interfaz y documentación en español de Chile.
- Al cerrar una fase, actualiza su estado en `docs/PLAN.md`.
