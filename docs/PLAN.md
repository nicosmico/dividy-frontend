# Plan de reconstrucción de Dividy

Estado: **en ejecución**. Este documento es la fuente de verdad del plan; se actualiza al cerrar cada fase.

Dividy es un MVP para dividir gastos de un grupo, solo en CLP y guardado en el navegador, pero diseñado para poder pasar a un backend compartido más adelante. El objetivo de esta reconstrucción es que **los números den confianza**: que cuadren al peso, que se puedan explicar y que estén cubiertos por tests.

- Vocabulario: [`CONTEXT.md`](../CONTEXT.md)
- Arquitectura: [`docs/architecture.md`](./architecture.md)
- Decisiones: [`docs/adr/`](./adr)

## Fases

| Fase | Objetivo                                                                                                         | Estado     |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| 0    | Fundaciones: dependencias al día, build/lint/format en verde, Vitest, CI                                         | Completada |
| 1    | Dominio y persistencia: lógica pura con tests (incluye property-based), repositorio, migración de datos antiguos | Pendiente  |
| 2    | Nueva UI sobre shadcn/ui: grupos, gastos, saldos, pagos, miembros; tests de componentes y E2E                    | Pendiente  |
| 3    | Pulido de experiencia: deshacer, estados vacíos, accesibilidad, compartir resumen, PWA                           | Pendiente  |
| 4    | Futuro (no planificado en detalle): backend y grupos compartidos, más monedas, divisiones no equitativas         | —          |

### Fase 0 · Fundaciones

**Estado: completada.** Versiones principales: React 19.3, React Router 7.18 (modo declarativo, import desde `react-router`), Vite 8, Vitest 5, Tailwind 4.3 (`@tailwindcss/vite`, tema en CSS), TypeScript 6.0, Zod 4.6, ESLint 9.39 + typescript-eslint 8.73, Zustand 5, Playwright 1.65, alias `@/*`. Desviaciones: se usó TypeScript 6.0 (la última soportada por typescript-eslint, rango `<6.1`) en vez de 5.9; React Router 8 ya existe, pero se mantuvo la 7 como indica la decisión 24; ESLint 10 ya existe, se mantuvo la 9. El E2E levanta `vite preview` sobre un build.

- Actualizar todas las dependencias a sus versiones mayores actuales: React 19, React Router 7, Vite, Tailwind 4, TypeScript 5.9, Zod 4, @hookform/resolvers, ESLint 9 (flat config) + typescript-eslint 8, Prettier.
- `npm run build`, `lint`, `format` y `typecheck` en verde.
- Vitest configurado (`npm test`), con jsdom y Testing Library listos para la fase 2.
- GitHub Actions: lint + typecheck + test + build en cada push/PR.
- `index.html` con `lang="es"`, título "Dividy" y favicon propio.
- **Criterio de salida**: CI verde y la app actual sigue funcionando igual que antes (es solo infraestructura).

### Fase 1 · Dominio y persistencia

- `src/domain`: tipos (`Group`, `Member`, `Expense`, `Payment`), dinero en enteros, división con resto determinístico, saldos, transferencias sugeridas, operaciones del grupo (agregar/editar/eliminar miembro, gasto y pago; eliminar miembro con reasignación o cascada), validaciones e invariantes, y el texto del resumen.
- `src/data`: puerto `GroupRepository` asíncrono, `LocalStorageGroupRepository`, `InMemoryGroupRepository` para tests, documento versionado y migración desde el formato antiguo (`members-store` / `bills-store`).
- Tests:
  - unitarios con tablas de casos (incluye cada bug encontrado en el análisis);
  - property-based con fast-check: la suma de las partes es igual al monto, la suma de los saldos es 0, las transferencias sugeridas llevan todos los saldos a 0 exacto, hay como máximo n-1 transferencias, todo son enteros y no hay montos ≤ 0;
  - tests de contrato del repositorio, que corren contra ambas implementaciones.
- **Criterio de salida**: cobertura ≥ 95 % en `src/domain`, sin dependencias de React en el dominio.

### Fase 2 · Nueva UI

- shadcn/ui + sonner + vaul, iconos lucide. Se eliminan los componentes propios y Zustand.
- TanStack Query sobre el repositorio.
- Rutas: `/` (mis grupos), `/groups/new`, `/groups/:groupId` con pestañas **Gastos**, **Saldos**, **Miembros**.
- Gastos: lista compacta con total del grupo; crear/editar en un drawer con botón **Guardar** explícito.
- Saldos: saldo por miembro con desglose ("pagó X, le corresponde Y, pagos ±Z"), transferencias sugeridas con "Marcar como pagado", estado "Al día", copiar resumen.
- Miembros: agregar, renombrar y eliminar (directo, o reasignar o eliminar en cascada con vista previa).
- Avatares generados localmente (sin llamadas de red).
- Error boundary y página 404.
- Tests de componentes de los formularios y E2E con Playwright de los flujos críticos (incluye las regresiones del análisis).
- **Criterio de salida**: todos los flujos se completan en móvil (390 px) y escritorio, y los E2E corren en CI.

### Fase 3 · Pulido

- Deshacer al borrar (toast), estados vacíos con guía, revisión de accesibilidad (teclado, lectores de pantalla, contraste), compartir con Web Share API, instalable como PWA, revisión de textos.

## Hallazgos del análisis inicial (regresiones a cubrir)

1. Borrar un gasto hacía que la tarjeta siguiente mostrara y guardara los datos del gasto borrado (`key={index}` + valores por defecto del formulario solo al montar).
2. Gastos duplicados al escribir rápido (un `debounce` recreado en cada render + un closure con estado viejo).
3. Montos en punto flotante: los saldos no cuadraban al peso y aparecían transferencias de "$0".
4. Eliminar un miembro podía dejar gastos sin participantes, y la plata del pagador desaparecía.
5. Pantalla en blanco al agregar un gasto sin miembros (sin error boundary).
6. El build no compilaba.

## Registro de decisiones (grilling)

Decisiones tomadas en rondas. Las de las rondas 0 vienen del dueño del producto; el resto las tomó el agente siguiendo esas directrices, para avanzar sin bloquearse. Cualquiera se puede revisar.

### Ronda 0 · Dueño del producto

- **Moneda**: solo CLP por ahora; si el MVP funciona, se abren otras monedas.
- **Persistencia**: local por ahora, pero sin amarrar el código a lo local; que pasar a backend sea extender, no reescribir.
- **Eliminar un miembro con gastos**: ofrecer reasignar sus gastos a otro miembro o eliminarlo junto con ellos.
- **Dependencias**: actualizarlas.
- **Producto**: repensar el modelo (por ejemplo, si tienen sentido los grupos) con criterio de producto.

### Ronda 1 · Modelo de producto y dinero

1. **¿Una sesión única o grupos?** → **Grupos.** La versión actual tiene un único "grupo implícito" en localStorage: para dividir un segundo evento hay que borrar todo. Los grupos son el modelo mental de este tipo de apps, y el grupo es la unidad natural para compartir con backend en el futuro. La pantalla de inicio pasa a ser "Mis grupos". El asistente por pasos (miembros → gastos → deudas) desaparece: dentro de un grupo se navega por pestañas.
2. **¿Cómo se representa el dinero?** → Pesos enteros; el grupo guarda `currency: 'CLP'`. Ver ADR 0001.
3. **¿Qué tipos de división existen?** → Solo partes iguales entre los participantes elegidos. Se modela como unión discriminada (`{ type: 'equal', participantIds }`) para agregar montos exactos o porcentajes después sin migrar.
4. **¿A quién le toca el resto?** → De a un peso a los primeros participantes según el orden de los miembros del grupo. Es determinístico y explicable ("a Ana le tocó $1 más por redondeo").
5. **¿Dónde vive la persistencia?** → Detrás de un repositorio asíncrono, con TanStack Query. Ver ADR 0002.
6. **¿Qué tan agresiva es la actualización?** → Todas las versiones mayores, en la fase 0, antes de escribir la nueva UI, para no escribir código dos veces.

### Ronda 2 · Reglas de dominio

7. **¿Cómo se calculan las transferencias sugeridas?** → Algoritmo voraz sobre enteros, determinístico, máximo n-1 transferencias. Ver ADR 0004.
8. **¿Se registran pagos?** → Sí, en el MVP. Sin pagos el grupo nunca queda "al día" y la app sirve una sola vez. "Marcar como pagado" en una transferencia sugerida crea un **Payment** por ese monto. También se pueden borrar pagos.
9. **¿Cómo se elimina un miembro?** → Directo si no tiene movimientos; si tiene, el usuario elige entre reasignar y eliminar en cascada, con vista previa. Ver ADR 0003.
10. **¿Qué invariantes tiene un gasto?** → Descripción no vacía (máximo 80 caracteres), monto entero entre 1 y 999.999.999, pagador y participantes que existan en el grupo, al menos un participante, sin participantes repetidos, fecha `YYYY-MM-DD` (por defecto, hoy). El pagador puede no participar.
11. **¿Nombres repetidos?** → No dentro de un mismo grupo (se compara sin mayúsculas ni espacios extremos): dos "Ana" hacen ilegibles los saldos. Los miembros se pueden renombrar; los IDs no cambian.
12. **¿Mínimo de miembros?** → El dominio no lo exige, pero la UI pide al menos 2 miembros para agregar gastos y lo explica.
13. **¿Un pago puede ser mayor que la deuda?** → Sí, el dominio lo permite (el saldo simplemente se invierte), pero desde la UI solo se crean pagos a partir de transferencias sugeridas, así que en la práctica no ocurre. Pago: monto > 0, emisor ≠ receptor, ambos del grupo.

### Ronda 3 · Experiencia

14. **Navegación** → `/` Mis grupos (con bienvenida breve si no hay ninguno), `/groups/new` crear grupo (nombre + miembros en un paso), `/groups/:groupId` con pestañas Gastos (por defecto), Saldos y Miembros. La landing de marketing se reduce a esa bienvenida.
15. **Edición de gastos** → Lista compacta (descripción, monto, quién pagó, fecha). Tocar un gasto abre un drawer con el formulario y botón Guardar; nada se guarda solo. Se muestra la parte de cada participante en vivo, ya con el resto aplicado.
16. **Explicar los números** → En Saldos, cada miembro muestra su saldo y, al expandirlo, el desglose: total pagado, total que le corresponde (con la lista de gastos) y pagos enviados/recibidos. Es la principal fuente de confianza.
17. **Avatares** → Se mantienen los avatares ilustrados (lorelei, alegre/triste) pero generados localmente con `@dicebear/core` + `@dicebear/collection`, con semilla en el ID del miembro. Se elimina la heurística de género por nombre y la dependencia de una API externa.
18. **Resumen** → Se mantiene "Copiar resumen" (formato para WhatsApp), generado desde el dominio. En la fase 3 se agrega Web Share API.
19. **Eliminar grupo** → Sí, con confirmación, desde el menú del grupo.

### Ronda 4 · Técnica

20. **Kit de UI** → shadcn/ui (Radix) + Tailwind 4, lucide, sonner, vaul. Ver ADR 0005.
21. **Estado** → TanStack Query para los datos; estado local de React para la UI. Se elimina Zustand.
22. **IDs** → `nanoid` (funciona sin contexto seguro, a diferencia de `crypto.randomUUID`, que rompía la app abierta por IP local), inyectable en tests.
23. **Formularios** → react-hook-form + Zod 4. Los esquemas de formulario son de la UI; las invariantes viven en el dominio (el formulario puede reusarlas).
24. **Router** → React Router 7 en modo declarativo (librería), sin framework mode ni SSR.
25. **Tests** → Vitest (unitarios, property-based con fast-check, componentes con Testing Library + jsdom), tests de contrato del repositorio y Playwright para E2E. Ver `docs/testing.md`.
26. **Migración de datos antiguos** → Al iniciar, si existen `members-store`/`bills-store` y no hay grupos, se crea el grupo "Mi grupo" con esos miembros y gastos (montos redondeados a enteros; se descartan los gastos sin participantes o con miembros inexistentes) y se borran las claves antiguas tras guardar con éxito.
27. **Estructura de carpetas** → Ver `docs/architecture.md`.
28. **Idioma** → Código en inglés; interfaz y documentación en español (es-CL). Sin librería de i18n por ahora.
29. **Deploy** → Netlify, como hoy (`public/_redirects`).
