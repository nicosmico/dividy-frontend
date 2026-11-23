# Estrategia de tests

En una app de plata, los tests son la evidencia de que los números son correctos. La mayor parte del esfuerzo va donde vive el dinero: el dominio.

| Capa          | Herramienta                      | Qué se prueba                                                                                                       | Dónde                                      |
| ------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Dominio       | Vitest                           | Casos concretos en tablas: divisiones, restos, saldos, transferencias, operaciones del grupo, errores de validación | `src/domain/**/*.test.ts`                  |
| Dominio       | Vitest + fast-check              | Propiedades que deben cumplirse para **cualquier** grupo generado al azar (ver abajo)                               | `src/domain/**/*.property.test.ts`         |
| Persistencia  | Vitest                           | Suite de contrato del `GroupRepository`, ejecutada contra cada implementación; migraciones del formato guardado     | `src/data/**/*.test.ts`                    |
| Componentes   | Vitest + Testing Library (jsdom) | Formularios y componentes con lógica: validaciones visibles, lo que se envía al guardar, estados vacíos             | junto al componente                        |
| End-to-end    | Playwright (desktop y móvil)     | Flujos completos en un navegador real y regresiones de bugs conocidos                                               | `e2e/`                                     |
| Accesibilidad | Playwright + axe-core            | Auditoría de cada pantalla principal (sin violaciones `serious` ni `critical`) y navegación con teclado             | `e2e/a11y.spec.ts`, `e2e/keyboard.spec.ts` |
| Sin conexión  | Playwright contra `vite preview` | Manifest e íconos, y que tras una carga la app abre y escribe con `context.setOffline(true)`                        | `e2e/offline.spec.ts`                      |

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

`renderWithProviders(ui?, { route, groups, repository, now, newId })` (`src/test/render-with-providers.tsx`) renderiza con QueryClient, `InMemoryGroupRepository`, reloj e ids fijos (`TEST_NOW`, `id1`, `id2`...), toaster y `MemoryRouter`; sin `ui` renderiza `<AppRoutes />` completo en `route`. Devuelve `user` (user-event) y el `repository`, para verificar lo guardado, y `currentPath()` para verificar la navegación. `renderHookWithProviders` hace lo mismo para hooks. Las pantallas se cargan con `React.lazy`, así que tras navegar hay que esperar con `waitFor` o `findBy*`. Vitest corre con `pool: 'vmThreads'` (un jsdom por worker, sin perder aislamiento entre archivos).

## Accesibilidad (axe)

`e2e/a11y.spec.ts` usa `@axe-core/playwright` con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `best-practice`, y falla ante cualquier violación `serious` o `critical` (el mensaje lista la regla y los selectores). Audita, en desktop y móvil: Mis grupos vacío, Crear grupo (también con errores), Mis grupos con grupos, Gastos con lista, formulario de gasto abierto (también con errores), Saldos (con el desglose abierto y con el diálogo de pago), Miembros y el diálogo de eliminar miembro (con la opción de reasignar). Si agregas una pantalla o diálogo nuevo, agrega su caso ahí. Los datos de prueba salen de `e2e/seed.ts` (`seedGroups` escribe en `localStorage` antes de que cargue la app).

`e2e/keyboard.spec.ts` recorre con Tab toda una pantalla comprobando que cada control muestra el foco, que el enlace "Saltar al contenido" es lo primero, que el foco queda atrapado en los diálogos y que vuelve a un lugar lógico al cerrarlos o al borrar algo.

axe no reemplaza probar con un lector de pantalla; cubre contraste, nombres accesibles, roles y estructura.

## Sin conexión

`e2e/offline.spec.ts` carga la app contra el build de `preview` (el servidor de Playwright ya hace `npm run build` primero), espera a que el service worker esté activo, recarga, pone el contexto sin red y comprueba: recarga en frío, enlace directo a `/groups/g1/members` (con su chunk y el generador de avatares precacheados) y que agregar un miembro sigue funcionando. Los demás E2E también corren con el service worker registrado.

## Proyectos de Playwright

`e2e/playwright.config.ts` define `chromium` (desktop), `mobile` (iPhone 13 emulado sobre Chromium) y `mobile-webkit` (iPhone 13 sobre WebKit real). `mobile-webkit` corre en CI (`CI` definida), donde el workflow instala `chromium webkit`. Localmente se omite, porque requiere `npx playwright install webkit`; para incluirlo, `PW_WEBKIT=1 npm run test:e2e`. El test de sin conexión se salta en WebKit (`setOffline` con service worker no es confiable ahí).

`e2e/sheets-overflow.spec.ts` abre cada bottom sheet en los proyectos móviles (nuevo gasto con descripción larga y $999.999.999, editar gasto, renombrar grupo, renombrar miembro y eliminar miembro con ambas opciones) y comprueba que ni el documento ni el sheet tienen desborde horizontal y que ningún elemento sobresale de sus bordes.

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
