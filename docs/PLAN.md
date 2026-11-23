# Plan de reconstrucción de Dividy

Estado: **en ejecución**. Este documento es la fuente de verdad del plan; se actualiza al cerrar cada fase.

Dividy es un MVP para dividir gastos de un grupo, solo en CLP y guardado en el navegador, pero diseñado para poder pasar a un backend compartido más adelante. El objetivo de esta reconstrucción es que **los números den confianza**: que cuadren al peso, que se puedan explicar y que estén cubiertos por tests.

- Vocabulario: [`CONTEXT.md`](../CONTEXT.md)
- Arquitectura: [`docs/architecture.md`](./architecture.md)
- Decisiones: [`docs/adr/`](./adr)

## Fases

| Fase | Objetivo                                                                                                         | Estado      |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ----------- |
| 0    | Fundaciones: dependencias al día, build/lint/format en verde, Vitest, CI                                         | Completada  |
| 1    | Dominio y persistencia: lógica pura con tests (incluye property-based), repositorio, migración de datos antiguos | Completada  |
| 2    | Nueva UI sobre shadcn/ui: grupos, gastos, saldos, pagos, miembros; tests de componentes y E2E                    | Completada  |
| 3    | Pulido de experiencia: deshacer, estados vacíos, accesibilidad, compartir resumen, PWA                           | Completada  |
| 4    | Consolidar la app local: tema y modo oscuro, calidad continua, divisiones, historial, monedas, búsqueda          | Planificada |
| 5    | Compartir: backend y grupos compartidos, foto de la boleta, recordatorios                                        | Futura      |

### Fase 0 · Fundaciones

**Estado: completada.** Versiones principales: React 19.3, React Router 7.18 (modo declarativo, import desde `react-router`), Vite 8, Vitest 5, Tailwind 4.3 (`@tailwindcss/vite`, tema en CSS), TypeScript 6.0, Zod 4.6, ESLint 9.39 + typescript-eslint 8.73, Zustand 5, Playwright 1.65, alias `@/*`. Desviaciones: se usó TypeScript 6.0 (la última soportada por typescript-eslint, rango `<6.1`) en vez de 5.9; React Router 8 ya existe, pero se mantuvo la 7 como indica la decisión 24; ESLint 10 ya existe, se mantuvo la 9. El E2E levanta `vite preview` sobre un build.

- Actualizar todas las dependencias a sus versiones mayores actuales: React 19, React Router 7, Vite, Tailwind 4, TypeScript 5.9, Zod 4, @hookform/resolvers, ESLint 9 (flat config) + typescript-eslint 8, Prettier.
- `npm run build`, `lint`, `format` y `typecheck` en verde.
- Vitest configurado (`npm test`), con jsdom y Testing Library listos para la fase 2.
- GitHub Actions: lint + typecheck + test + build en cada push/PR.
- `index.html` con `lang="es"`, título "Dividy" y favicon propio.
- **Criterio de salida**: CI verde y la app actual sigue funcionando igual que antes (es solo infraestructura).

### Fase 1 · Dominio y persistencia

**Estado: completada.** `src/domain` (cobertura 100 % de líneas y 98 % de ramas, umbral 95 % en la config de Vitest), `src/data` y `src/lib/id.ts`, con tests de contrato y de migración. La API pública está en [`docs/architecture.md`](./architecture.md#api-del-dominio). Decisiones de implementación: ronda 5.

- `src/domain`: tipos (`Group`, `Member`, `Expense`, `Payment`), dinero en enteros, división con resto determinístico, saldos, transferencias sugeridas, operaciones del grupo (agregar/editar/eliminar miembro, gasto y pago; eliminar miembro con reasignación o cascada), validaciones e invariantes, y el texto del resumen.
- `src/data`: puerto `GroupRepository` asíncrono, `LocalStorageGroupRepository`, `InMemoryGroupRepository` para tests, documento versionado y migración desde el formato antiguo (`members-store` / `bills-store`).
- Tests:
  - unitarios con tablas de casos (incluye cada bug encontrado en el análisis);
  - property-based con fast-check: la suma de las partes es igual al monto, la suma de los saldos es 0, las transferencias sugeridas llevan todos los saldos a 0 exacto, hay como máximo n-1 transferencias, todo son enteros y no hay montos ≤ 0;
  - tests de contrato del repositorio, que corren contra ambas implementaciones.
- **Criterio de salida**: cobertura ≥ 95 % en `src/domain`, sin dependencias de React en el dominio.

### Fase 2 · Nueva UI

**Estado: completada.** Fase 2a (base de la app, grupos y miembros): completada. Fase 2b (gastos, saldos, pagos y resumen): completada; decisiones en la ronda 7.

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

**Estado: completada.** Decisiones en la ronda 8; ideas para lo que sigue, en "Fases 4 y 5 · Roadmap acordado".

- Deshacer al borrar (toast), estados vacíos con guía, revisión de accesibilidad (teclado, lectores de pantalla, contraste), compartir con Web Share API, instalable como PWA, revisión de textos.
- Además: estado del grupo en Mis grupos ("Al día" / "Pendiente"), contadores de caracteres, avatares con carga diferida y auditoría axe en los E2E.

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

### Ronda 5 · Decisiones de implementación de la Fase 1

30. **Errores** → Toda operación del dominio devuelve `Result<T>`; el error tiene un `code` (unión de literales) y un `message` en español listo para mostrar. Se agregó `duplicate_id` (gasto o pago con un id ya usado) y `duplicate_member_id`.
31. **Entradas de gastos y pagos** → `addExpense`/`addPayment` reciben los campos del usuario más `id` y `createdAt` (inyectados); `updateExpense` recibe sólo los campos y conserva `id` y `createdAt`. Los validadores devuelven los datos normalizados (nombres y descripciones con `trim`).
32. **Eliminar miembro** → `getMemberRemovalImpact` devuelve listas de gastos y pagos (no solo conteos) para que la UI muestre la vista previa. `expensesDeletedByCascade` incluye los gastos que pagó el miembro y los que quedarían sin participantes. En `reassign`, el destino debe existir y ser distinto del miembro (`invalid_reassign_target`).
33. **Detalle por miembro** → `getMemberBreakdown` devuelve `null` si el miembro no existe, y las líneas de gasto incluyen los gastos que pagó sin participar (parte 0).
34. **Invariantes de un grupo** → `getGroupIssues(group)` lista las invariantes rotas; el repositorio lo usa al leer, así un documento con referencias rotas se trata como corrupto.
35. **Documento corrupto** → Se considera corrupto el documento entero solo si es JSON inválido, no tiene versión, la versión es futura o la forma del documento es inválida: se copia a `dividy.corrupted.<ISO>` una sola vez por texto distinto, la clave `dividy` no se toca hasta el próximo `save` y se parte vacío. _(Revisada en la ronda 6, decisión 40: los grupos con invariantes rotas se validan por separado.)_
36. **Migración antigua** → Nombres vacíos pasan a "Sin nombre" y los de más de 40 caracteres se recortan; las descripciones vacías pasan a "Gasto" y las de más de 80 se recortan. Sufijos " (2)", " (3)" para duplicados sin distinguir mayúsculas. La `date` de los gastos es la parte `YYYY-MM-DD` del `now` recibido (UTC). Si no hay miembros que migrar, no se crea nada y las claves antiguas se dejan intactas. Si el guardado falla, las claves antiguas se conservan y se reintenta en la siguiente operación.
37. **Aislamiento** → Los repositorios no comparten referencias con quien llama (`structuredClone` en memoria; JSON en localStorage); el contrato lo verifica.
38. **Resumen** → Formato con secciones `*Gastos*`, `*Saldos*` y `*Para quedar al día*`; un grupo sin transferencias muestra "¡Están al día! 🎉".
39. **Cobertura** → El umbral de 95 % para `src/domain/**` está en `vite.config.ts` y hace fallar `npm run test:coverage`. Se excluyen tests, `test-utils` y `*.contract.ts`.

### Ronda 6 · Decisiones de la Fase 2a

40. **Validación por grupo** → `parseDocument` valida cada grupo por separado: los válidos se cargan y cada grupo inválido (forma o invariantes rotas) se omite y se copia a `dividy.corrupted.<ISO>` como `{ reason, group }` (con sufijo `#n` si hay varios en la misma lectura), una sola vez por contenido. Así un grupo roto no deja la app vacía. JSON inválido, sin versión o versión desconocida siguen siendo corrupción del documento entero. El próximo `save` reescribe `dividy` solo con los grupos válidos; los respaldos permanecen.
41. **Alcance de la 2a** → Base (shadcn/ui, tema, `ResponsiveDialog`, providers, router, error boundary, 404), Mis grupos, Crear grupo, página del grupo (renombrar y eliminar) y pestaña Miembros (agregar, renombrar y eliminar con reasignación o cascada). Gastos y Saldos son placeholders "Próximamente" que reemplaza la 2b. Se eliminó la UI antigua, Zustand y `@tabler/icons-react`.
42. **shadcn escrito a mano** → El registro de shadcn no es accesible desde el entorno de desarrollo, así que los componentes de `src/components/ui` se escribieron siguiendo el estilo new-york (paquete único `radix-ui`, `vaul`, `sonner`, `lucide-react`) con `components.json` listo para `npx shadcn add`. Se agregaron solo los que se usan; no hay `tabs` (las pestañas son enlaces de ruta en un `nav`) ni `form` (react-hook-form se integra con `FormField`).
43. **Tema** → Variables de shadcn en `src/index.css`: fondo `#F8F7F1`, tarjetas blancas, primario zinc-900, acento `#FDE68A`, radio 1rem, sombra `shadow-soft`. Solo modo claro. Botones e inputs de 44 px de alto, `prefers-reduced-motion` respetado. Columna `max-w-lg` centrada en todos los tamaños.
44. **Drawer o Dialog** → `ResponsiveDialog` usa `matchMedia('(min-width: 768px)')` (`useMediaQuery`); sin `matchMedia` (jsdom) asume escritorio. Las confirmaciones simples usan `AlertDialog`.
45. **Hooks de datos** → `useGroupOperation(groupId).run(fn)` siempre resuelve con `Result<Group, OperationError>`: lee el grupo del repositorio (no de la caché, para no pisar datos nuevos con una pantalla vieja), aplica la función del dominio, hace `touch(group, now())` y guarda. Errores de guardado y grupo inexistente muestran toast y se devuelven como `save_failed` / `group_not_found`. `now` y `newId` se inyectan con `RepositoryProvider`. Las queries no reintentan y lanzan al error boundary (que limpia los errores de queries al volver al inicio).
46. **Total gastado** → Se agregó `getTotalSpent(group)` al dominio (suma de gastos, sin pagos) con test, para la tarjeta del grupo; la 2b lo reutiliza en la pestaña Gastos.
47. **Crear grupo** → Nombre y miembros en un solo formulario; Enter agrega un miembro (no envía el formulario); el nombre escrito pero no agregado se incluye al crear; mínimo 2 miembros (regla de la UI, decisión 12). Validación con `validateGroupName` / `validateMemberName`, mensajes del dominio.
48. **Eliminar miembro** → Sin movimientos: `AlertDialog`. Con movimientos: `ResponsiveDialog` con vista previa (gastos pagados, gastos en que participa, pagos) y `RadioGroup` "Reasignar a…" (+ `Select`) o "Eliminar con sus gastos" (lista `expensesDeletedByCascade`, pagos que se borran y gastos donde las partes de los demás cambian). El botón se habilita al elegir. Al reasignar, los pagos entre ambos miembros se eliminan (el dominio descarta pagos a uno mismo) y el diálogo lo avisa. Los errores del dominio se muestran en el diálogo.
49. **Avatares** → `@dicebear/core` + `@dicebear/lorelei` (el estilo suelto en vez de `@dicebear/collection`: el bundle es idéntico porque el build elimina los demás estilos, pero los tests no cargan 30 estilos). Cuesta unos 52 kB gzip (bundle total 259 kB gzip; sin code splitting todavía). `mood: 'happy' | 'sad'` elige entre las bocas `happy01-18` y `sad01-09`; semilla = id del miembro, así el avatar no cambia al renombrar. Resultado en caché por semilla y ánimo.
50. **Tests** → `renderWithProviders` / `renderHookWithProviders` en `src/test/`; Vitest con `pool: 'vmThreads'` (suite de ~7 s a ~3 s). E2E: flujo completo de grupo y miembros, 404 / grupo inexistente y migración desde `members-store` / `bills-store`, en desktop y móvil. `tsconfig.node.json` incluye la lib DOM para los `page.evaluate` de los E2E.
51. **Pendiente para la 2b / 3** → Gastos, Saldos, pagos y resumen; usar `useGroupOperation`, `ResponsiveDialog`, `FormField`, `todayLocal`, `formatDate` y `MemberAvatar mood='sad'` para quien debe. Code splitting de rutas si el bundle sigue sobre 500 kB. Los avatares no tienen heurística de género por decisión 17.

### Ronda 7 · Decisiones de la Fase 2b

52. **Formulario de gasto** → `ExpenseForm` (react-hook-form) dentro de `ResponsiveDialog`, montado con `key={expense?.id ?? 'new'}` (hallazgo 1). La validación es un `resolver` propio que llama a las funciones del dominio (`validateExpenseForm` en `expense-form.ts`), así los mensajes son los del dominio y se muestran por campo. Los participantes se guardan en el orden del grupo, no en el de los clics. Nada se guarda solo: solo el botón **Guardar**.
53. **Sin doble envío** → El id del gasto nuevo se genera una vez al montar el formulario y un `ref` cierra el envío tras el primer intento (se reabre solo si falla); además el botón se deshabilita con `isPending`. Un doble clic, aun disparado antes del siguiente render, guarda una sola vez (hallazgo 2). La confirmación de "Marcar como pagado" y la de eliminar un pago usan el mismo candado.
54. **Monto en pesos** → `AmountInput`: texto con `inputMode="numeric"`, solo dígitos (máximo 10, sin ceros a la izquierda), muestra `10.000` mientras se escribe y restaura el cursor contando los dígitos que quedaron a su izquierda. El valor del formulario es el string de dígitos; se convierte a entero al validar. Un monto sobre $999.999.999 muestra el error del dominio.
55. **Partes en vivo** → Se calculan con `computeShares` sobre un gasto temporal con los valores del formulario (nunca se divide fuera del dominio). Los que reciben el peso de resto se detectan comparando su parte con `floor(monto / n)`; la nota dice "Por redondeo, a Ana le toca $1 más" (o "a Ana y Beto les toca").
56. **Lista y botón** → Gastos ordenados por fecha y, a igual fecha, por `createdAt` descendente, agrupados con "Hoy", "Ayer" o `formatDate`. Un único botón "Agregar gasto": fijo abajo en móvil (con degradado y espacio al final de la lista para no tapar nada) y en el encabezado desde `md`. Con menos de 2 miembros queda deshabilitado, con un aviso y enlace a Miembros (decisión 12). "entre N" muestra el número de participantes y "entre todos" cuando son todos los miembros.
57. **Saldos** → Orden: estado general ("¡Están al día! 🎉" o transferencias sugeridas), saldo por miembro, pagos registrados y copiar resumen. Sin gastos ni pagos, estado vacío con enlace a Gastos. El saldo se muestra con texto y color: "Le deben $X" (verde), "Debe $X" (rojo), "Al día" (gris); el avatar es `sad` si debe. Cada miembro se expande (`Collapsible` de Radix) y muestra pagó, le corresponde, pagos enviados y recibidos, la fórmula del saldo y los gastos en que aparece con su parte, para poder verificar a mano.
58. **Marcar como pagado** → `AlertDialog` "¿Ana le pagó $3.334 a Beto?" y, al confirmar, `addPayment` con `id: newId()`, `date: todayLocal()`, `createdAt: now()` y el mismo monto de la transferencia (decisiones 8 y 13). Los pagos registrados se pueden eliminar con confirmación.
59. **Copiar resumen** → `navigator.clipboard.writeText(formatGroupSummary(group))`; si falla o no existe, un diálogo con un `textarea` de solo lectura con el texto seleccionable.
60. **Pluralización** → `plural(n, 'gasto', 'gastos')` en `src/lib/plural.ts` (con test) reemplaza al `pluralize` local y corrige textos como "Tiene 1 pago enviado o recibido" y "También se borrará 1 pago".
61. **Code splitting** → Todas las pantallas son `React.lazy`. El aviso de chunk sobre 500 kB desapareció: el mayor es el de miembros (avatares dicebear, 335 kB, 112 kB gzip) y el inicial pesa 316 kB (96 kB gzip). Los tests de navegación pasaron a esperar la carga con `waitFor`.
62. **Tests** → Componentes: formulario (crear, errores, partes en vivo con resto, doble clic, editar, eliminar, hallazgo 1), lista, botón deshabilitado y Saldos completos. E2E (desktop y móvil): flujo completo con montos calculados por el dominio y regresiones de los hallazgos 1, 2 y 4.
63. **Pendiente para la Fase 3** → Deshacer al eliminar (toast), Web Share API, PWA, revisión de accesibilidad con lector de pantalla (los botones "Marcar como pagado" no mencionan a quién; hoy el título del diálogo de confirmación sí), y un contador de caracteres visible de caracteres en la descripción.

### Ronda 8 · Decisiones de la Fase 3

64. **Deshacer en vez de confirmar** → `useGroupOperation.run` devuelve, en caso de éxito, `previous` (el grupo anterior) y `undo()`. `undo` restaura `previous` solo si el `updatedAt` guardado sigue siendo el de la operación; si cambió o el grupo ya no existe, no toca nada y avisa "No se pudo deshacer porque el grupo cambió." Es genérico: cualquier operación del dominio puede ofrecer deshacer con `toastUndoable(mensaje, result)` (toast de 6 s con **Deshacer**). Con eso se **quitó la confirmación previa** al eliminar un gasto, un pago y un miembro sin movimientos (el flujo es un toque menos y el error se corrige sin fricción). Se **mantiene** donde el impacto es grande o difícil de revertir: eliminar un miembro con movimientos (elige reasignar o eliminar en cascada con vista previa; igual ofrece deshacer después), eliminar el grupo (se borra el documento completo y no hay snapshot que restaurar) y "Marcar como pagado" (registra algo, no borra). Se descartó guardar un historial de operaciones: un solo paso de deshacer, solo mientras el toast está visible, basta para corregir un toque equivocado y no añade estado persistente.
65. **Estado del grupo** → Cada tarjeta de Mis grupos muestra un badge "Al día" (acento) o "Pendiente: $X por saldar" (rojo, con texto además del color). X es la suma de las transferencias sugeridas, calculada por la función nueva `getPendingAmount(group)` del dominio (con tests). Un grupo sin gastos aparece "Al día" (todos los saldos son cero).
66. **Compartir resumen** → Si existe `navigator.share`, el botón dice "Compartir resumen" y comparte `{ title, text }` con el texto de `formatGroupSummary`; si no, "Copiar resumen" como antes. Cancelar el menú (`AbortError`) no muestra nada. Si compartir falla por otra causa, cae en copiar y, si eso también falla, en el diálogo con el texto seleccionable. `CopySummaryButton` pasó a `ShareSummaryButton`.
67. **Accesibilidad** → (a) axe en los E2E (`@axe-core/playwright`, etiquetas WCAG 2.0/2.1 A y AA más buenas prácticas, falla con `serious` y `critical`) sobre las 8 pantallas principales, en desktop y móvil. El único hallazgo fue `label-content-name-mismatch` en las filas de saldo ("Ver detalle de Ana" no contenía el texto visible): se quitó el `aria-label` y el nombre accesible es ahora el texto visible ("Ana Le deben $5.166"), con el avatar `decorative` para no repetir el nombre. (b) "Marcar como pagado" lleva `aria-label="Marcar como pagado: Carla le paga $3.333 a Ana"`. (c) Contador "12/80" en la descripción del gasto y "n/40" en nombres de grupo y de miembro (`FormField counter`), en rojo si se pasa. (d) Teclado: enlace "Saltar al contenido", `ResponsiveDialog` devuelve el foco a quien lo abrió (Radix no lo hace sin trigger) y el Drawer lo mueve al panel al abrirse; tras borrar algo que tenía el foco, `restoreFocusIfLost` lo lleva a un lugar lógico ("Agregar gasto", el encabezado de la lista o `<main>`). Un E2E recorre con Tab una pantalla completa verificando el anillo de foco. No se probó con un lector de pantalla real (queda para la Fase 4).
68. **PWA** → `vite-plugin-pwa` 2.x (soporta Vite 8), modo `generateSW` con Workbox: precache de todo el build y `navigateFallback` a `index.html`. **`registerType: 'prompt'`** con un toast "Hay una nueva versión de Dividy" y botón **Recargar**, en vez de `autoUpdate`: `autoUpdate` recarga la página sola y podría descartar un gasto a medio escribir. No se avisa "listo para usar sin conexión" para no sumar un toast en la primera visita. Manifest en español (`lang es-CL`, `display standalone`, `theme_color #18181b`, `background_color #F8F7F1`). Íconos 192, 512, maskable 512 y `apple-touch-icon` 180 generados con Playwright desde `public/favicon.svg` (`scripts/generate-icons.mjs`, sin dependencia nueva) y commiteados; los maskable e iOS van sin esquinas redondeadas porque el sistema aplica su propia máscara. El E2E `offline.spec.ts` verifica manifest e íconos y, contra `preview`, que tras una carga la app abre en frío, abre un enlace directo (con sus chunks y el generador de avatares) y permite escribir sin red.
69. **Rendimiento** → `@dicebear` se carga con `import()` desde `avatar-generator.ts` la primera vez que se necesita; mientras tanto `MemberAvatar` muestra un círculo del mismo tamaño con la inicial (sin saltos de layout) y, si la carga falla, se queda así. Resultado en gzip: chunk de miembros 111,9 kB → 61,1 kB, más un chunk `avatar-generator` de 50,7 kB que se pide después del primer render (inicial: 96,4 kB → 96,5 kB). El total descargado es parecido, pero la pantalla ya es interactiva sin esperar el generador, y con el precache del service worker todo queda disponible sin conexión. Se eliminó `@hookform/resolvers` (no se usaba: el formulario de gasto tiene su propio resolver).
70. **Textos** → Tuteo neutro y mensajes que dicen qué hacer: "Escribe un nombre para el grupo." (antes "El nombre del grupo no puede estar vacío."), "Ingresa un monto en pesos enteros, entre $1 y $999.999.999.", "Elige una fecha válida.", "Elige quién pagó entre los miembros del grupo.", "Ya hay alguien llamado "Ana" en el grupo. Usa otro nombre.", "Este grupo ya no existe. Vuelve a Mis grupos." y el error inesperado sugiere volver al inicio. Se corrigió además un error de concordancia ("La descripción no puede estar vacío"). Convención: botones y títulos en minúscula salvo la primera palabra ("Agregar gasto", "Mis grupos"), toasts en pasado sin punto final ("Gasto eliminado") y mensajes de error con punto final.
71. **Tests** → Hook de deshacer (restaura, bloquea si el grupo cambió o fue eliminado, error de guardado), componentes de deshacer para gasto, pago y miembro, badges de Mis grupos, compartir resumen (comparte, cancelar sin error, falla y copia), "Pagado por" con el `Select`, contadores y avatar con placeholder. E2E nuevos: axe, teclado y sin conexión (el total de E2E pasó de 14 a 40 al contar desktop y móvil). `src/test/setup.ts` descarta los toasts entre tests (sonner los guarda en un store global).

### Ronda 9 · Correcciones post-PR

72. **Scroll horizontal en sheets (Safari iOS)** → El control nativo de fecha tiene ancho mínimo intrínseco y no se encoge con `w-full` mientras sea `display: flex` con apariencia nativa; dentro del contenedor con `overflow-y: auto` el desborde se volvía scroll horizontal. `Input` usa para `date`, `time` y `datetime-local`: `block`, `appearance-none`, `min-w-0 w-full`, `[&::-webkit-date-and-time-value]:text-left` y `min-h-11` (sin apariencia nativa iOS colapsa el alto si está vacío). Red de seguridad: el contenedor del sheet suma `overflow-x-hidden` y `overscroll-contain` (los anillos de foco de 3px caben en el margen `px-4`). Además, las grillas de los formularios usan `grid-cols-[minmax(0,1fr)]` y los textos largos (título del drawer, gastos listados al eliminar un miembro) `break-words`.
73. **Flash blanco al cerrar el teclado (Safari iOS)** → `Drawer` de vaul 1.1.2 tiene `repositionInputs` activo por defecto: ajusta `height` y `bottom` del drawer con los eventos `resize` de `visualViewport`, y en iOS el cierre del teclado no siempre se informa bien, así que quedaba desfasado. Se pasa `repositionInputs={false}`: iOS ya desplaza el campo enfocado a la vista y el sheet tiene `max-h-[90svh]` con scroll propio.
74. **Pruebas** → Proyecto `mobile-webkit` (iPhone 13 en WebKit) en CI, omitido localmente salvo `PW_WEBKIT=1`; E2E de regresión `sheets-overflow.spec.ts`. Lo que no se automatiza (teclado, `visualViewport`, zoom) queda en el checklist manual de `docs/testing.md`.

### Ronda 10 · Gastos ya saldados y avisos

75. **Advertir en vez de bloquear** → Los saldos se derivan siempre de todos los gastos y pagos, así que agregar un gasto después de registrar pagos funciona bien. Pero editar o eliminar un gasto que ya se consideró en pagos cambia saldos que la gente dio por cerrados (ejemplo: Ana paga $10.000 entre tres, Beto y Carla le pagan $3.333 y quedan al día; si alguien elimina el gasto, Ana pasa a "Debe $6.666" sin que nadie lo note). El cálculo es correcto, pero sorprende. El dueño del producto eligió **no bloquear**, porque corregir un error (monto mal escrito, gasto duplicado) debe seguir siendo posible, y **advertir con una vista previa del impacto**: un `AlertDialog` "Este gasto ya se consideró en pagos registrados" con el antes y el después de cada miembro afectado ("Ana: Al día → Debe $6.666", con las mismas palabras que Saldos) y un botón rojo "Eliminar de todas formas" / "Guardar de todas formas". Cancelar es el foco inicial y, al cerrar, el foco vuelve a quien abrió el aviso. Se descartó bloquear (obliga a borrar pagos a mano para corregir un error) y pedir confirmación siempre (ruido: el aviso solo sale cuando hay algo que decir).
76. **Regla de "gasto cubierto" (Covered expense)** → Un gasto está cubierto si existe al menos un pago del grupo con `createdAt` **posterior** al del gasto (`isExpenseCoveredByPayments`). Es simple y explicable, y prefiere un aviso de más a uno de menos: no mira quién pagó a quién ni si el pago "corresponde" al gasto. Editar un gasto conserva su `createdAt`, así que editarlo no lo "descubre". El aviso solo aparece si además `previewBalanceChange(group, nextGroup)` no está vacío, donde `nextGroup` sale de aplicar `updateExpense` / `removeExpense` del dominio al grupo actual (no se duplican reglas). Una edición que no cambia saldos (por ejemplo solo la descripción) guarda directo, y eliminar un gasto no cubierto sigue siendo "Deshacer" sin confirmación. "Deshacer" funciona también después de confirmar el aviso. Eliminar un miembro conserva su propio diálogo de impacto.
77. **Posición de los toasts** → Abajo y centrados (antes arriba, donde en móvil tapaban el logo y el título del grupo), también en escritorio. `--toast-bottom` (en `index.css`) suma `env(safe-area-inset-bottom)`; mientras el botón fijo "Agregar gasto" está en pantalla en móvil (`ExpensesTab` marca `<html data-floating-action>` si hay gastos), el toast sube sobre él (`5.5rem + max(1rem, inset)`) y nunca lo cubre. Como un toast abajo taparía los botones del pie de un bottom sheet o diálogo, **mientras hay un modal abierto** (se detecta con `data-scroll-locked` en `<body>`) los toasts pasan arriba. Dos detalles para que "Deshacer" siga usable con un sheet abierto: Radix deja `pointer-events: none` en `<body>` (el toaster vive fuera del modal), por eso los toasts fuerzan `pointer-events: auto`; y tocar un toast no cuenta como "clic fuera" de `ResponsiveDialog`, así el formulario no se cierra ni pierde lo escrito.
78. **Exportar e importar datos: descartado** → Por decisión del dueño del producto, el respaldo en archivo no se hará: se resolverá con el backend (ítem final de la Fase 4). **Riesgo aceptado:** hasta entonces los datos viven solo en el navegador; borrar los datos del sitio, usar un modo privado o cambiar de dispositivo los pierde sin forma de recuperarlos. Se quitó el ítem de los siguientes pasos.
79. **Pruebas** → Dominio: tabla de casos (el ejemplo, gasto posterior al último pago, grupo sin pagos, edición que no cambia saldos) y propiedades (`previewBalanceChange(g, g)` es `[]`; los cambios suman 0, siguen el orden del grupo y ninguno tiene `before === after`). Componentes: aviso al eliminar y al guardar con los montos, cancelar sin cambios y con foco de vuelta, confirmar con "Deshacer", gasto no cubierto y cubierto solo con cambio de descripción sin aviso. E2E (desktop y móvil): el flujo del ejemplo completo con montos calculados por el dominio, agregar un gasto después de los pagos sin aviso, el toast en la mitad inferior sin superponerse al botón "Agregar gasto" (bounding boxes) y el toast con un sheet abierto (no tapa sus botones, "Deshacer" funciona y el sheet sigue abierto). `ConfirmCoveredChange` y `describeBalance` (`@/lib/balance-text`, compartido con Saldos) son las piezas nuevas de UI.

### Ronda 11 · Prioridades de las fases 4 y 5 (dueño del producto)

80. **Orden de la Fase 4** → tema de colores (claro y oscuro) → calidad continua → división por montos o partes → historial → monedas por grupo → búsqueda y filtros.
81. **Moneda** → por grupo, elegida al crear el grupo, no por gasto. Solo editable mientras el grupo no tenga gastos.
82. **Tema** → el dueño del producto entrega una imagen con dos colores para modo claro y oscuro; reemplaza la paleta amarilla/anaranjada actual.
83. **Foto de la boleta y recordatorios** → a la Fase 5: sin backend no tienen sentido (no hay dónde guardar la foto, y una notificación con la app cerrada necesita un servidor).
84. **Mejoras de la lista** → por ahora solo búsqueda y filtros; categorías y notas no entran.
85. **Cerrar cuentas por períodos** → descartado: cuando termina una etapa se crea un grupo nuevo.
86. **Backend** → Fase 5, después de consolidar la app local.

## Fases 4 y 5 · Roadmap acordado

Prioridades decididas por el dueño del producto (Ronda 11). Cada ítem merece su propio ADR o ronda de decisiones antes de empezar.

### Fase 4 · Consolidar la app local (en este orden)

1. **Tema de colores claro y oscuro.** Nueva paleta a partir de dos colores que entrega el dueño del producto (reemplaza el acento amarillo/anaranjado actual), con modo oscuro. Incluye la pasada con lector de pantalla (VoiceOver/TalkBack) y la revisión de contraste a mano en ambos temas. Va primero para que las capturas de referencia de los tests visuales se tomen con el tema definitivo.
2. **Calidad continua.** Presupuesto de bundle en CI, pruebas visuales de regresión (capturas a 390 y 1280 px, claro y oscuro) y un E2E del aviso "Hay una nueva versión" (simular dos builds).
3. **División por montos exactos, porcentajes o partes.** El tipo `split` ya es una unión discriminada (`type: 'equal'`); falta `exact`, `percent` y `shares`, con la misma garantía de que las partes suman el monto al peso (extender `computeShares` y las propiedades de fast-check) y un selector de tipo en el formulario.
4. **Historial de actividad y edición de pagos.** Ver qué pasó en el grupo ("Beto eliminó Supermercado $10.000") para responder "¿por qué cambió mi saldo?", y poder editar monto y fecha de un pago. Es también la base natural de la sincronización de la Fase 5.
5. **Monedas por grupo.** La moneda se elige **al crear el grupo** (no por gasto) y todos sus gastos y pagos se expresan en ella; solo se puede cambiar mientras el grupo no tenga gastos. Sin conversión entre monedas. El dinero entero pasa a "unidad menor" de cada moneda (ADR 0001 tendrá que actualizarse).
6. **Búsqueda y filtros en la lista de gastos.** Por texto, persona o fecha.

### Fase 5 · Compartir (requiere backend)

- **Backend y grupos compartidos.** Que todos vean el mismo grupo. `HttpGroupRepository` detrás del puerto actual (pasando la suite de contrato), identidad ligera (enlace de invitación, sin cuenta al inicio), resolución de conflictos (versionado por grupo u operaciones) y sincronización con la cola offline que la PWA hace posible. Trae también el respaldo de los datos (exportar/importar quedó descartado, Ronda 10).
- **Foto de la boleta.** Sin backend no tiene sentido guardarla solo en el dispositivo.
- **Recordatorios para saldar.** Notificaciones del tipo "Tienes $3.333 pendientes con Ana": para que lleguen con la app cerrada las tiene que enviar un servidor (Web Push), y en iPhone solo funcionan con la app instalada.

### Descartado

- **Exportar e importar datos** (Ronda 10, decisión 78): se resolverá con el backend.
- **Cerrar cuentas por períodos** (Ronda 11): cuando termina una etapa, se crea un grupo nuevo.
