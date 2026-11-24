# Estrategia de tests

En una app de plata, los tests son la evidencia de que los números son correctos. La mayor parte del esfuerzo va donde vive el dinero: el dominio.

| Capa          | Herramienta                      | Qué se prueba                                                                                                                                | Dónde                                                           |
| ------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Dominio       | Vitest                           | Casos concretos en tablas: divisiones, restos, saldos, transferencias, operaciones del grupo, errores de validación                          | `src/domain/**/*.test.ts`                                       |
| Dominio       | Vitest + fast-check              | Propiedades que deben cumplirse para **cualquier** grupo generado al azar (ver abajo)                                                        | `src/domain/**/*.property.test.ts`                              |
| Persistencia  | Vitest                           | Suites de contrato del `GroupRepository` y del `SnapshotRepository`, ejecutadas contra cada implementación; migraciones del formato guardado | `src/data/**/*.test.ts`                                         |
| Componentes   | Vitest + Testing Library (jsdom) | Formularios y componentes con lógica: validaciones visibles, lo que se envía al guardar, estados vacíos                                      | junto al componente                                             |
| End-to-end    | Playwright (desktop y móvil)     | Flujos completos en un navegador real y regresiones de bugs conocidos                                                                        | `e2e/`                                                          |
| Accesibilidad | Playwright + axe-core            | Auditoría de cada pantalla principal en claro y oscuro (sin violaciones `serious` ni `critical`) y navegación con teclado                    | `e2e/a11y.spec.ts`, `e2e/keyboard.spec.ts`, `e2e/theme.spec.ts` |
| Sin conexión  | Playwright contra `vite preview` | Manifest e íconos, y que tras una carga la app abre y escribe con `context.setOffline(true)`                                                 | `e2e/offline.spec.ts`                                           |
| Nueva versión | Vitest + Playwright              | El aviso "Hay una nueva versión de Dividy": lógica del toast y flujo real con un segundo `sw.js`                                             | `src/app/pwa.test.tsx`, `e2e/pwa-update.spec.ts`                |
| Visual        | Playwright `toHaveScreenshot`    | Capturas de las pantallas principales en claro y oscuro contra imágenes base (solo en Docker, proyecto `visual`)                             | `e2e/visual.spec.ts`                                            |
| Tamaño        | Node + Vitest                    | Presupuesto de tamaño gzip del bundle y de cada chunk                                                                                        | `scripts/check-bundle-size.mjs`, `bundle-budget.json`           |

## Propiedades del dominio

Para cualquier grupo válido generado al azar:

1. La suma de las partes de un gasto es exactamente su monto, y cada parte difiere de las demás en a lo más $1.
2. La suma de los saldos del grupo es 0.
3. Aplicar las transferencias sugeridas deja todos los saldos exactamente en 0.
4. Hay como máximo `n - 1` transferencias sugeridas para `n` miembros con saldo distinto de cero, y ninguna tiene monto ≤ 0 ni va de un miembro a sí mismo.
5. Todos los montos calculados son enteros.
6. Los cálculos son determinísticos: la misma entrada da la misma salida.
7. Reasignar o eliminar en cascada un miembro deja un grupo válido (sin referencias a ese miembro y sin gastos sin participantes).

## Tests de componentes

`renderWithProviders(ui?, { route, groups, snapshots, repository, snapshotRepository, now, newId })` (`src/test/render-with-providers.tsx`) renderiza con QueryClient, `InMemoryGroupRepository`, reloj e ids fijos (`TEST_NOW`, `id1`, `id2`...), toaster y `MemoryRouter`; sin `ui` renderiza `<AppRoutes />` completo en `route`. Devuelve `user` (user-event) y el `repository`, para verificar lo guardado, y `currentPath()` para verificar la navegación. `renderHookWithProviders` hace lo mismo para hooks. Las pantallas se cargan con `React.lazy`, así que tras navegar hay que esperar con `waitFor` o `findBy*`. Vitest corre con `pool: 'vmThreads'` (un jsdom por worker, sin perder aislamiento entre archivos).

## Compartir por link y capturas

- **Dominio** (`src/domain/snapshot.test.ts`): tablas de `createSnapshot`, `decideSnapshotSave` (más nuevo, más viejo, mismo, un milisegundo) y de la forma compacta (índices fuera de rango, fechas imposibles, nombres repetidos...), y propiedades de fast-check: ida y vuelta por la forma compacta y mismos saldos que el grupo original.
- **Codec** (`src/features/share/snapshot-codec.test.ts`): tabla de links dañados (vacío, truncado, base64 que no es deflate, forma equivocada, índices imposibles, versión desconocida, zip bomb; decodificar nunca lanza), propiedad de ida y vuelta con saldos iguales, y el **test de tamaño** (8 miembros y 60 gastos, bajo 4.000 caracteres). Los links "a mano" se arman con `node:zlib`, una implementación independiente de la que usa la app.
- **Persistencia:** `describeSnapshotRepositoryContract` (`src/data/snapshot-repository.contract.ts`) corre contra la implementación en memoria y la de `localStorage`; la migración v3 → v4 y la cuarentena de capturas inválidas están en `migrations.test.ts` y `local-storage-snapshot-repository.test.ts` (que además prueba que grupos y capturas comparten el documento sin pisarse).
- **Componentes** (`src/features/share/share.test.tsx`): la vista sin controles de edición, el aviso, el resumen con "Cuentas al" y el link, el aviso de privacidad, el link inválido, guardar / actualizar / aviso de más vieja, eliminar con deshacer y la sección de Mis grupos. Usa `renderWithProviders(undefined, { route: '/shared/expenses#v1...', snapshots })`; el link se arma con `encodeSnapshot(createSnapshot(group, takenAt))`.
- **E2E** (`e2e/share.spec.ts`): crea un grupo con gastos y un pago, comparte (`navigator.share` se reemplaza por un stub que guarda el texto; `Compartir resumen` lo usa), abre el link en un **contexto de navegador nuevo** sin datos y recorre solo lectura, saldos iguales, "Ver cómo se calculó", guardar, recargar, reemplazar con un link más nuevo, el aviso de uno más viejo, eliminar y deshacer. También links corruptos y un link armado con zlib. `e2e/snapshot-link.ts` arma esos links desde Node. `openTab` acepta el hash (`#v1...`) en la URL.
- `src/test/setup.ts` copia `CompressionStream` / `DecompressionStream` de `node:stream/web`: el contexto VM de Vitest no los trae y el navegador sí.

## Accesibilidad (axe)

`e2e/a11y.spec.ts` usa `@axe-core/playwright` con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `best-practice`, y falla ante cualquier violación `serious` o `critical` (el mensaje lista la regla y los selectores). Audita, en desktop y móvil y **en claro y en oscuro** (`test.use({ colorScheme })`): Mis grupos vacío, Crear grupo (también con errores), Mis grupos con grupos, Gastos con lista, formulario de gasto abierto (también con errores), Saldos (con el desglose abierto y con el diálogo de pago), Miembros y el diálogo de eliminar miembro (con la opción de reasignar), y las pantallas de capturas: la captura abierta desde un link (Gastos, Saldos con el desglose abierto y "Ver cómo se calculó"), un link que no se pudo abrir y Mis grupos con "Compartidos conmigo" junto a una captura guardada. Si agregas una pantalla o diálogo nuevo, agrega su caso ahí. Los datos de prueba salen de `e2e/seed.ts` (`seedGroups` escribe en `localStorage` antes de que cargue la app).

`e2e/theme.spec.ts` cubre el selector de tema: elegir "Oscuro" y recargar (sigue oscuro y sin destello: registra desde `addInitScript` la clase `dark` al crear `<body>` y el fondo cuando React monta), el sistema oscuro sin elección, "Sistema" en vivo y las metas `theme-color`.

`e2e/keyboard.spec.ts` recorre con Tab toda una pantalla comprobando que cada control muestra el foco, que el enlace "Saltar al contenido" es lo primero, que el foco queda atrapado en los diálogos y que vuelve a un lugar lógico al cerrarlos o al borrar algo.

axe no reemplaza probar con un lector de pantalla; cubre contraste, nombres accesibles, roles y estructura.

## Sin conexión

`e2e/offline.spec.ts` carga la app contra el build de `preview` (el servidor de Playwright ya hace `npm run build` primero), espera a que el service worker esté activo, recarga, pone el contexto sin red y comprueba: recarga en frío, enlace directo a `/groups/g1/members` (con su chunk y el generador de avatares precacheados) y que agregar un miembro sigue funcionando. Los demás E2E también corren con el service worker registrado.

## Nueva versión (PWA)

El aviso "Hay una nueva versión de Dividy" (`src/app/pwa.ts`) se prueba en dos niveles:

- **Unitario** (`src/app/pwa.test.tsx`): `registerSW` se reemplaza por un doble; verifica que registrar no muestra nada, que `onNeedRefresh` muestra el toast, que no desaparece solo y que "Recargar" llama a `updateSW(true)`. La lógica del toast vive en `showUpdateToast(updateSW)`, separada del registro.
- **E2E con el build real** (`e2e/pwa-update.spec.ts`): carga la app, espera al service worker, "publica" una versión nueva y verifica que aparece el aviso, que la página **no** se recarga sola (una marca en `window` sigue ahí y hay un worker en espera), que "Recargar" recarga y activa el worker nuevo y que los datos siguen. También que la primera visita y una revisión sin cambios no muestran el aviso.

Cómo se simula el segundo build: `e2e/dist-server.ts` sirve `dist/` en un puerto libre (su propio origen, así cada test tiene su propio service worker) y `publishNewVersion()` agrega un comentario a `sw.js`; para el navegador, cualquier cambio de bytes es una versión nueva, y `registerType: 'prompt'` la deja en espera hasta tocar "Recargar". Se descartaron dos alternativas: interceptar `sw.js` con `page.route` / `context.route` (Playwright no intercepta la petición de actualización del propio service worker, lo comprobamos: el handler nunca se ejecuta) y modificar `dist/sw.js` en disco (afectaría a los demás tests, que comparten el servidor de `preview`). El test se salta en WebKit por lo mismo que `offline.spec.ts`.

## Regresión visual

`e2e/visual.spec.ts` toma una captura (`toHaveScreenshot`) de cada pantalla principal en **claro y oscuro**: Bienvenida, Mis grupos (con "Compartidos conmigo"), Gastos, Nuevo gasto, Saldos (página completa), Miembros, "Ver cómo se calculó" en el paso 4, una captura de solo lectura y el link inválido. Corre **solo** en el proyecto `visual` (Chromium, 390×844, escala 1, `reducedMotion: 'reduce'`, `es-CL`, `America/Santiago`), y ese proyecto no corre ningún otro spec; los demás proyectos ignoran `visual.spec.ts`.

Determinismo: datos de `e2e/seed.ts`, reloj fijo con `page.clock.setFixedTime` (24-nov-2026 11:45 -03:00), `animations: 'disabled'`, `caret: 'hide'`, espera de `document.fonts.ready`, de las imágenes y de que los avatares (DiceBear, perezosos) reemplacen su placeholder, y `maxDiffPixelRatio: 0.005`. La Bienvenida se captura en su primer cuadro, que es estable porque con movimiento reducido no hay reproducción automática. No se enmascara nada: no hubo nada inevitablemente variable.

**Por qué en Docker.** Los píxeles dependen del build de Chromium y de las fuentes del sistema (la app usa la pila `system-ui`), así que una imagen base hecha en un Mac, o con otro Chromium, falla en CI. Por eso las imágenes se generan y comparan **siempre** en la imagen oficial `mcr.microsoft.com/playwright:v<versión>-noble`, con la misma versión que `@playwright/test` en `package-lock.json` (los workflows la leen del lockfile).

- **CI** (`.github/workflows/ci.yml`, job `visual`): corre `npm run test:visual -- --update-snapshots=none` dentro de ese contenedor. Si no hay imágenes base, falla con un mensaje claro (no las crea en silencio: eso escondería regresiones). Si hay diferencias, sube el reporte con los diffs como artefacto `visual-diffs`.
- **Actualizar las imágenes** (cambio de diseño intencional, o la primera vez): Actions > "Update visual snapshots" > Run workflow, con el nombre de la rama (nunca `main`: el workflow se niega). Corre `npm run test:visual:update` en el mismo contenedor y hace commit y push de `e2e/__screenshots__/baseline/` como `github-actions[bot]` ("test(visual): update baselines"). Un push hecho con el `GITHUB_TOKEN` no dispara CI: vuelve a correr el workflow `CI` de la rama a mano. Revisa las imágenes cambiadas en el PR antes de aceptarlas.
- **Local**: `npm run test:visual` y `npm run test:visual:update`. Si defines `PW_CHROMIUM_PATH` (un Chromium que no es el de CI), las imágenes van a `e2e/__screenshots__/local/`, que está en `.gitignore`, y nunca se comparan contra las de CI. Sirven para verificar que el spec corre y es determinista (3 corridas seguidas pasan), no como referencia. Para generar las de verdad sin esperar a CI: `docker run --rm --ipc=host -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v<versión>-noble sh -c "npm ci && npm run test:visual:update"`.
- Una captura que falla por un cambio **no intencional** es una regresión: corrígela. Si el cambio es intencional, actualiza las imágenes.

## Presupuesto de tamaño del bundle

`npm run size` (después de `npm run build`; corre también en CI, y escribe la tabla en el resumen del job) mide el tamaño **gzip** del JS inicial (el script de entrada y los `modulepreload` de `index.html`), del CSS inicial y de cada chunk de `dist/assets`, y lo compara con `bundle-budget.json` (valores en bytes, con ~10 % de margen sobre lo medido, redondeados a 100 B). Imprime siempre una tabla; si algo se pasa, falla diciendo qué pieza y por cuánto. Un chunk nuevo, sin presupuesto, también falla. Los chunks se identifican sin el hash (`index.js`, `members.js`).

**Subir el presupuesto conscientemente:** si el aumento es intencional (una dependencia nueva, una pantalla nueva), corre `npm run build && npm run size -- --write`, revisa el diff de `bundle-budget.json` y explica el aumento en el PR. Antes de subirlo, pregúntate si el código puede cargarse de forma diferida (`React.lazy`) o si hay una alternativa más liviana. La lógica de comparación es una función pura (`scripts/bundle-size-lib.mjs`) con sus tests en `scripts/bundle-size.test.mjs`.

## Proyectos de Playwright

`e2e/playwright.config.ts` define `chromium` (desktop), `mobile` (iPhone 13 emulado sobre Chromium) y `mobile-webkit` (iPhone 13 sobre WebKit real). `mobile-webkit` corre en CI (`CI` definida), donde el workflow instala `chromium webkit`. Localmente se omite, porque requiere `npx playwright install webkit`; para incluirlo, `PW_WEBKIT=1 npm run test:e2e`. El test de sin conexión se salta en WebKit (`setOffline` con service worker no es confiable ahí). El proyecto `visual` se describe en "Regresión visual".

**Tests "skipped" en una corrida local.** Es lo esperado, no un problema: `mobile-webkit` no corre localmente (sin `PW_WEBKIT=1`), así que sus tests no se cuentan; los que figuran como saltados son condicionales por proyecto: `e2e/sheets-overflow.spec.ts` solo aplica a los proyectos móviles (se salta en `chromium`, que abre diálogos centrados y no bottom sheets), el test de escritorio de `e2e/explanation-page.spec.ts` se salta en los móviles, y los de service worker (`offline.spec.ts`, `pwa-update.spec.ts`) se saltan en WebKit, es decir, solo en CI. Cada `test.skip` lleva su motivo en el código.

`e2e/sheets-overflow.spec.ts` abre cada bottom sheet en los proyectos móviles (nuevo gasto con descripción larga y $999.999.999, editar gasto, renombrar grupo, renombrar miembro y eliminar miembro con ambas opciones) y comprueba que ni el documento ni el sheet tienen desborde horizontal y que ningún elemento sobresale de sus bordes.

`e2e/covered-expenses.spec.ts` cubre el aviso de gastos ya saldados (el ejemplo de la Ronda 10 con montos calculados por el dominio) y la posición de los toasts: abajo, centrados, sin superponerse al botón "Agregar gasto" ni a los botones de un sheet abierto (compara bounding boxes).

## Limitaciones: iOS

El proyecto WebKit da un layout parecido al de Safari (motor de render, controles nativos de fecha, `100svh`), pero no idéntico a iOS. **No se puede automatizar**: el teclado virtual de iOS, el `visualViewport` real (que cambia al abrir y cerrar el teclado) ni el zoom de Safari al enfocar un campo.

Checklist manual en un iPhone real para cada PR que toque formularios o sheets:

1. Abrir cada sheet (nuevo gasto, editar gasto, renombrar grupo, renombrar miembro, eliminar miembro en ambas opciones, copiar resumen).
2. Escribir en cada campo, incluido el selector de fecha.
3. Cerrar el teclado (tocar fuera del campo o "OK").
4. Girar el teléfono a horizontal y volver a vertical.
5. Verificar en cada paso que no hay scroll horizontal dentro del sheet ni de la página, ni destellos blancos donde estaba el teclado.

## Convenciones

- Los tests describen comportamiento en español del dominio (`it('reparte el resto de a un peso a los primeros participantes')`).
- Nada de `Date.now()` ni IDs aleatorios en el dominio: se inyectan, así los tests son determinísticos.
- Cada bug encontrado se cubre primero con un test que falla y después se corrige.
- Los toasts de sonner viven en un store global: `src/test/setup.ts` hace `toast.dismiss()` después de cada test para que uno no vea los toasts del anterior. Para probar un deshacer con "el grupo cambió", pasa un `now` que avance (o cambia `updatedAt` en el repositorio): con el reloj fijo de `TEST_NOW` todas las escrituras comparten `updatedAt`.
- Los avatares se cargan de forma diferida: en tests, usa `findByAltText` (o `waitFor`) para la imagen; antes aparece un placeholder con `role="img"` y el mismo nombre.
- Los E2E son pocos y cubren flujos, no reglas: las reglas se prueban en el dominio, que es más rápido y preciso.

## Comandos

```bash
npm test               # unitarios + componentes
npm run test:coverage  # con cobertura (meta: ≥ 95 % en src/domain)
npm run test:e2e       # Playwright (no incluye el proyecto `visual`, que solo existe con `--project=visual`)
npm run test:visual    # regresión visual (en CI y en Docker; ver arriba)
npm run test:visual:update  # regenera las imágenes base
npm run size           # presupuesto de tamaño del bundle (después de build)
```
