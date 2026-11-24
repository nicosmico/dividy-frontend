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

## Proyectos de Playwright

`e2e/playwright.config.ts` define `chromium` (desktop), `mobile` (iPhone 13 emulado sobre Chromium) y `mobile-webkit` (iPhone 13 sobre WebKit real). `mobile-webkit` corre en CI (`CI` definida), donde el workflow instala `chromium webkit`. Localmente se omite, porque requiere `npx playwright install webkit`; para incluirlo, `PW_WEBKIT=1 npm run test:e2e`. El test de sin conexión se salta en WebKit (`setOffline` con service worker no es confiable ahí).

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
npm run test:e2e       # Playwright
```
