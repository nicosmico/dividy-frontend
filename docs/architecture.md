# Arquitectura

Dividy es una SPA (React + Vite) sin backend. La arquitectura separa tres capas para que la lógica de dinero sea pura y testeable, y para que cambiar `localStorage` por una API sea agregar una implementación y no reescribir la app.

```
UI (React, shadcn/ui)  ──usa──▶  hooks de datos (TanStack Query)  ──usa──▶  GroupRepository, SnapshotRepository y ViewerRepository (puertos)
        │                                                                         ▲
        └──────────────── usa funciones puras ──▶  domain  ◀── usa ── LocalStorageGroupRepository
```

## Capas

### `src/domain`: reglas de negocio puras

- Sin React, sin `localStorage`, sin fechas "de ahora" ni IDs aleatorios implícitos (se reciben como parámetros).
- Tipos: `Group`, `Member` (con `avatar`), `Expense`, `Payment`, `Amount`.
- Avatares (`avatar.ts`): `nextAvatarColor` (primer color libre del grupo, ciclo desde el 9.º), `validateAvatar` y `regenerateMemberAvatar(group, memberId, seed)`; la semilla nueva la inyecta la UI con `newId()`. `createGroup` y `addMember` asignan el color y la semilla inicial (el id, o `avatarSeed` si la UI ya la cambió).
- Capturas (`snapshot.ts`, ADR 0006): `Snapshot` (copia fija de un grupo con ids por posición), `createSnapshot`, `snapshotToGroup` (una captura como `Group`, para reutilizar cálculos y pantallas), `getSnapshotIssues`, `decideSnapshotSave` (guardar, reemplazar, misma o más vieja, por `takenAt`) y la forma compacta del link (`toCompactSnapshotV2` / `fromCompactSnapshotV2`, posiciones en vez de ids; `V1` solo sabe de partes iguales y sigue decodificándose). El esquema de bytes (compresión, base64url) no vive aquí: es una API web y está en `src/features/share`.
- Viewer (`viewer.ts`, ADR 0007): `ViewerChoice` (`{ memberId }` o `{ none: true }`), `ViewerScope` (`{ kind: 'group' | 'snapshot', id }`), `resolveViewer` / `isStaleViewerChoice` (una elección que apunta a un miembro que ya no existe cuenta como "aún no se preguntó"), `viewerFirst(items, viewerId, involvesViewer)` (partición estable: lo del viewer primero, sin perder ni repetir elementos) y `describeViewerStatus(group, viewerId)` (el titular de Saldos: `general`, `group-settled`, `owes`, `owed` o `even`, con montos del mismo cálculo de saldos).
- División (`split.ts`, ADR 0008): `Split` es una unión de cuatro formas (`equal`, `exact`, `percent` en puntos básicos y `shares`); `computeShares` es la única función que divide (resto por orden de miembros), `validateSplit` dice qué corregir, `presetSplit` arma valores que ya cuadran para empezar a editar, y `reassignSplit` / `toEqualSplit` los usa eliminar miembro.
- Funciones: división con resto (`computeShares`), saldos (`computeBalances`, con desglose por miembro), transferencias sugeridas (`suggestTransfers`), operaciones inmutables sobre un grupo (`addExpense`, `removeMember`…) que validan invariantes y devuelven un grupo nuevo o un error tipado, y el texto del resumen.
- Es la capa con más tests: tablas de casos y tests de propiedades.

### `src/data`: persistencia

- `GroupRepository`: interfaz **asíncrona** (`list`, `get`, `save`, `delete`). Solo guarda y recupera grupos completos; no tiene reglas de negocio.
- `LocalStorageGroupRepository`: documento `{ version, groups, snapshots }` en una sola clave (compartida con las capturas, ver más abajo), con migraciones por versión y migración desde el formato antiguo.
  - **Documento v3** (historia): cada miembro tiene `avatar: { color: 0-7, seed }`. La migración `v2 → v3` (`migrations[2]`) pone `seed = id` (nadie cambia de cara) y asigna los colores en el orden de los miembros de cada grupo, sin repetir hasta 8 y volviendo a empezar desde el 9.º; no toca nada más, así que no se pierden datos. Un documento v3 se lee tal cual; uno con versión mayor se rechaza.
  - **Documento v2** (historia): igual que la v1, pero los nombres de grupos y miembros y las descripciones de gastos empiezan con mayúscula. La migración `v1 → v2` (`migrations[1]` en `src/data/migrations.ts`) aplica `capitalizeFirst` a esos textos. Si capitalizar un nombre de miembro chocara (sin distinguir mayúsculas) con otro del mismo grupo, conserva el valor original para no perder datos; con datos v1 válidos no ocurre, porque la unicidad ya ignoraba mayúsculas. Un documento v2 se lee tal cual; uno con versión mayor se rechaza.
- `SnapshotRepository`: segundo puerto asíncrono (`list`, `get`, `save`, `delete`, clave `sourceGroupId`) para las capturas guardadas desde un link; mismas reglas que `GroupRepository` (no tiene reglas de negocio: qué captura gana lo decide el dominio). Implementaciones `LocalStorageSnapshotRepository` e `InMemorySnapshotRepository`, con su propia suite de contrato.
  - **Documento v4** (`CURRENT_VERSION = 4`): `{ version, groups, snapshots }`. La migración `v3 → v4` (`migrations[3]`) agrega `snapshots: []` y no toca nada más. Cada captura se valida por separado (`snapshotSchema`, con `getSnapshotIssues`, y una sola por `sourceGroupId`); las inválidas van a cuarentena (`dividy.corrupted.<ISO>`, con `{ reason, snapshot }`) igual que los grupos. Un documento v4 sin la lista se lee como vacía.
  - `LocalStorageStore`: dueño del documento (leer, escribir, migración desde el formato antiguo y cuarentena). `LocalStorageGroupRepository` y `LocalStorageSnapshotRepository` comparten una sola instancia (se arma en `App.tsx`), así leen y escriben el mismo documento sin pisarse y la migración antigua y los respaldos ocurren una vez.
- `ViewerRepository`: tercer puerto asíncrono (`get`, `set`, `clear`, por `ViewerScope`) con "quién soy" en este dispositivo (ADR 0007). `LocalStorageViewerRepository` lo guarda en su **propia clave** (`dividy.viewers`, `{ version: 1, choices: { 'group:<id>' | 'snapshot:<id>': choice } }`), fuera del documento de grupos (que sigue en v4) y por tanto sin pasar por `LocalStorageStore`; un valor ilegible cuenta como "nadie preguntó". `InMemoryViewerRepository` para tests, con su suite de contrato.
- `InMemoryGroupRepository`: para tests.
- Tests de contrato compartidos: la misma suite corre contra cada implementación de cada puerto (y correrá contra una futura `HttpGroupRepository`).

### `src/app` + `src/features`: interfaz

```
src/
  app/                 main.tsx, App.tsx (BrowserRouter + repositorio real), providers.tsx
                       (QueryClient + RepositoryProvider + Toaster), router.tsx (AppRoutes),
                       AppLayout (enlace "Saltar al contenido", header + columna max-w-lg),
                       ErrorBoundary, NotFoundPage, pwa.ts (registro del service worker)
  components/          dividy-logo, balance-label (saldo en palabras y color), theme-toggle, form-field, responsive-dialog, page-dialog, page-fallback, tab-nav (las pestañas de un grupo y de una captura)
    ui/                shadcn/ui (button, input, label, card, dialog, alert-dialog, drawer,
                       dropdown-menu, radio-group, segmented-control, select, separator, skeleton, badge, sonner)
  features/
    groups/            data/ (hooks y contexto), components/ (Welcome: bienvenida animada sin grupos), pages/ (GroupsPage, NewGroupPage, GroupLayout)
    members/           ViewerSheet ("¿Quién eres?": caritas del grupo o captura, lee todo de `useViewer()`), MembersTab, MemberAvatar (placeholder + carga diferida de dicebear), useMemberMoods (carita según el saldo, a partir de `computeBalances`), diálogos de
                       renombrar y eliminar miembro (el de eliminar solo para miembros con movimientos)
    expenses/          ExpensesTab (lista por fecha), ExpenseDialog + ExpenseForm (crear/editar/eliminar; "Dividir entre" con el control segmentado Iguales / Montos / % / Partes, un `SplitValueInput` por participante y la línea de estado en vivo),
                       AmountInput (pesos con separador de miles), expense-form.ts (validación con el
                       dominio, formato chileno de los campos, precarga y `describeSplitStatus`), expense-list.ts (orden y agrupación por fecha)
    icons/             suggestIcon (función pura) + keywords.ts (diccionario) + ENTITY_ICONS (clave → Lucide)
                       + EntityIcon (tile). Calculado al mostrar; nada se guarda (decisión 89)
    explanation/       buildExplanation(group) (pura: tramos por gasto de lo que pagó cada uno y de su parte, saldos, transferencias sugeridas y color por gasto, con `computeShares`, `computeBalances` y `suggestTransfers`), buildLegend, narrate (texto de cada paso), buildExampleGroup / settleGroup (el ejemplo de la bienvenida, en memoria), buildShareSteps (pura: los sub-pasos del paso 2, un gasto cada uno) y narrateShareStep,
                       PaidShareRow (la fila "Gastó / Su parte" que dibujan el gráfico de Saldos y la animación; con `motion` se anima, con `tooltips` sus tramos son botones; los tramos de "Gastó" llevan un corte por participante con `computeCuts` y `describeDivision` de `cuts.ts`, y su ancho se mide con `useElementWidth`), ExplanationPlayer (`layout: 'card' | 'page'`; en `page` cuerpo con scroll y pie solo con controles; animación de 4 pasos sobre esas filas horizontales para cualquier cantidad de miembros; el paso 2 va gasto por gasto; CSS transitions) y LazyExplanationPlayer (su propio chunk)
    share/             compartir por link y capturas (ADR 0006): snapshot-codec (`encodeSnapshot` / `decodeSnapshot`, link `v2.<payload>` en el hash (el decodificador sigue aceptando `v1.`); decodificar nunca lanza), `useShareLink` (arma el link mientras la pantalla está abierta para que `navigator.share` se llame sin esperar), data/ (hooks de TanStack Query: `useSnapshots`, `useSnapshot`, `useSaveSnapshot`, `useDeleteSnapshot`), pages/ (`LinkSnapshotPage` en `/shared`, que decodifica el hash, y `SavedSnapshotPage` en `/shared/:snapshotId`) y components/ (SnapshotView con el aviso fijo, las pestañas Gastos y Saldos y el `Outlet`; SaveSnapshotControls; DeleteSnapshotButton; SharedWithMeSection, la sección de Mis grupos; InvalidLink)
    balances/          BalancesTab: PaidVsShareChart ("Gastó vs. su parte" con `PaidShareRow` de explanation, tramos con tooltip, leyenda, tabla y botón "Ver cómo se calculó" que abre la animación en un PageDialog a pantalla completa en móvil), BalancesTab ordena: estado con "Compartir resumen", transferencias, pagos y "Detalle", SuggestedTransfers ("Marcar como pagado"), MemberBalances (desglose),
                       PaymentsList, ShareSummaryButton (compartir o copiar el resumen, con el link de solo lectura y el aviso de privacidad)
  hooks/               use-media-query, use-theme (tema claro/oscuro; ver docs/design-system.md), use-snapshot-view (`useSnapshotView()` / `useReadOnly()`: contexto del modo solo lectura) y su `SnapshotViewProvider`
  lib/                 utils (cn), dates (todayLocal, formatDate), plural, id, query-client,
                       focus (restoreFocusIfLost, MAIN_ID)
  test/                setup.ts, render-with-providers.tsx, test-providers.tsx
```

- `src/features/<feature>`: pantallas y componentes de cada área. Una feature usa el dominio para calcular y los hooks de datos para leer y escribir.
- `src/components/ui`: componentes de shadcn/ui (copiados, modificables; ADR 0005).
- `src/lib`: utilidades transversales (`cn`, fechas locales, ids).

Regla de dependencias: `domain` no importa nada del resto; `data` importa solo `domain`; la UI importa ambos. Una feature no importa archivos internos de otra feature: usa su `index.ts`. La excepción es la capa de datos de grupos, que es la base compartida: las demás features la importan desde `@/features/groups/data` (que no carga páginas, así no hay ciclos con `@/features/groups`, cuyas páginas usan `@/features/members`). Las rutas se ensamblan en `src/app/router.tsx`: `GroupLayout` carga el grupo y lo entrega a la pestaña activa por `Outlet context`. La feature `share` puede importar la capa de datos de grupos, y `groups` (Mis grupos) y `balances` (compartir resumen) importan `@/features/share`.

**Solo lectura (capturas).** `/shared` (el link, con la captura en el hash) y `/shared/:snapshotId` (una guardada; el id es el `sourceGroupId`) tienen las pestañas `expenses` y `balances` y **reutilizan** `ExpensesTab` y `BalancesTab`: `SnapshotView` entrega `snapshotToGroup(captura)` por `Outlet context` y envuelve todo en `SnapshotViewProvider`; `useReadOnly()` hace que esas pestañas oculten "Agregar gasto", la edición de gastos, "Marcar como pagado" y eliminar pagos. Las pestañas conservan el hash al navegar (`/shared/balances#v2...`). Miembros y las opciones del grupo no existen en esa vista.

**Carga diferida.** `router.tsx` carga cada pantalla con `React.lazy`; `AppLayout` y `GroupLayout` envuelven su `Outlet` en `Suspense` con `PageFallback` (skeleton), así el encabezado y las pestañas no parpadean al cambiar de pantalla. En los tests, la navegación a una pantalla es asíncrona: usa `waitFor` / `findBy*`.

#### Hooks de datos (`@/features/groups/data`)

- `RepositoryProvider({ repository, snapshotRepository?, viewerRepository?, now?, newId? })` y `useServices()`: inyectan el `GroupRepository`, el `SnapshotRepository` (`services.snapshots`; vacío en memoria si no se pasa), el `ViewerRepository` (`services.viewers`; vacío en memoria si no se pasa), el reloj (`now(): string` ISO) y el generador de ids. En producción, `LocalStorageGroupRepository`; en tests, `InMemoryGroupRepository` con `now` y `newId` fijos.
- `useGroups()` y `useGroup(groupId)` (`data: Group | null`): queries de TanStack Query.
- `useViewer()` y `ViewerProvider({ scope, members })` (`viewer.tsx` y `viewer-context.ts`): cargan la elección del ámbito, la resuelven contra los miembros (y limpian una que apunta a un miembro que ya no existe) y la entregan por contexto: `{ viewerId, sheetOpen, openSheet, closeSheet, choose(memberId), skip() }`. Fuera de un proveedor no hay viewer (`viewerId: null`). `GroupLayout` y `SnapshotView` lo montan con `key` por grupo; al cargar la elección por primera vez, si nadie preguntó, abren la hoja (una vez por visita; cerrarla sin elegir no guarda nada). `BalancesTab`, `SuggestedTransfers`, `PaidVsShareChart`, `MemberBalances` y `MembersTab` usan `useViewer()` para el titular, el orden y "(tú)" (`ViewerName`); la animación "Ver cómo se calculó" no.
- `useCurrentGroup(): Group`: el grupo de la ruta, dentro de una pestaña de `GroupLayout`.
- `useGroupOperation(groupId)` → `{ run(operation), isPending }`. `operation` es una función del dominio `(group) => Result<Group>`, p. ej. `(g) => addExpense(g, input)`. `run` lee el grupo del repositorio, aplica la operación y: si el dominio falla devuelve `{ ok: false, error }` sin guardar; si funciona hace `touch(group, now())`, `repository.save` e invalida las queries (`{ ok: true, value, previous, undo }`). Si el guardado falla (por ejemplo, cuota llena) muestra un toast de error y devuelve `code: 'save_failed'`; `isInfrastructureError(error)` distingue estos casos de los errores de dominio, que el formulario muestra en línea.
- **Deshacer.** El resultado exitoso trae `previous` (el grupo antes de la operación) y `undo()`. `undo` vuelve a leer el grupo; si su `updatedAt` sigue siendo el que guardó la operación, guarda `previous`, invalida las queries y muestra "Cambio deshecho"; si cambió (o el grupo ya no existe), no toca nada y muestra "No se pudo deshacer porque el grupo cambió." Devuelve `true` o `false` y muestra sus propios toasts. `toastUndoable(mensaje, result)` muestra el toast de éxito con el botón **Deshacer** durante 6 s (`UNDO_DURATION_MS`). Se usa al eliminar un gasto, un pago o un miembro; sirve para cualquier operación. Como la comparación es por `updatedAt`, cualquier cambio posterior (de otra pestaña, por ejemplo) bloquea el deshacer en vez de pisarlo.
- `useCreateGroup()` → `{ create({ name, memberNames }), isPending }` y `useDeleteGroup()` → `{ remove(groupId): Promise<boolean>, isPending }`.

#### Piezas reutilizables

- `ResponsiveDialog({ open, onOpenChange, title, description?, children })` + `ResponsiveDialogFooter`: Drawer (vaul) bajo 768 px, Dialog desde 768 px. Se usa en todos los formularios.
- `FormField({ label, error?, hint?, children: (control) => ReactNode })`: label, mensaje de error y `aria-*`; se usa con react-hook-form (`<Input {...control} {...register('x')} />`).
- `MemberAvatar({ member, mood?: 'happy' | 'sad', decorative? })`: avatar `lorelei` generado localmente con `@dicebear/core` + `@dicebear/lorelei`, con la semilla y el color de `member.avatar` (paleta de 8 pasteles en `avatar-palette.ts`, expuesta como `data-avatar-color`). `AvatarButton` lo envuelve en un botón de 44 px con `aria-label="Cambiar avatar de Ana"`. Dicebear solo lo importa `avatar-generator.ts`, que `avatar-uri.ts` carga con `import()` la primera vez que hace falta; mientras tanto (o si falla) se muestra un círculo del mismo tamaño con la inicial. El resultado se guarda en caché por semilla, color y ánimo, así que los avatares ya vistos se pintan sin parpadeo. `decorative` oculta el avatar a los lectores de pantalla cuando el nombre ya está al lado.
- `FormField({ label, error?, hint?, counter?: { length, max }, children })`: `counter` muestra "12/80" junto a la etiqueta (rojo si se pasa del máximo).
- `restoreFocusIfLost(fallback?)` (`@/lib/focus`): tras borrar algo que tenía el foco, lo mueve a `fallback` (o a `<main id="main-content">`) solo si se perdió en `<body>`.
- `PageDialog({ open, onOpenChange, title, description, children })`: página completa (`100dvh`, safe areas) bajo 768 px y diálogo centrado de alto fijo desde 768 px, con encabezado fijo y ✕; el contenido trae su cuerpo con scroll y su pie. Lo usa "Ver cómo se calculó".
- `ResponsiveDialog` y `PageDialog` (con el hook `useReturnFocus`) recuerdan el elemento que lo abrió y le devuelve el foco al cerrarse (Radix no puede, porque estos diálogos se abren por estado y no con un trigger); el Drawer mueve el foco al panel al abrirse (sin abrir el teclado del celular).
- `ConfirmCoveredChange` (expenses): `AlertDialog` que avisa que un gasto cubierto cambiará saldos, con antes y después por miembro (`describeBalance` de `@/lib/balance-text`) y botón destructivo; el foco inicial es Cancelar y al cerrar vuelve a quien lo abrió.
- Toasts: abajo y centrados; `--toast-bottom` (index.css) respeta `env(safe-area-inset-bottom)` y sube sobre el botón fijo "Agregar gasto" en móvil (`data-floating-action` en `<html>`, lo pone `ExpensesTab`).
- `formatAmount` (dominio), `todayLocal()` y `formatDate(value)` (`@/lib/dates`), `plural(n, 'gasto', 'gastos')` (`@/lib/plural`).

## Flujo de una escritura

1. El usuario guarda un gasto en el drawer (`ResponsiveDialog`).
2. El hook `useGroupOperation` toma el grupo actual, aplica `addExpense(group, input)` del dominio y, si es válido, llama `repository.save(nextGroup)`.
3. TanStack Query invalida la query del grupo; la UI recalcula saldos con `computeBalances` (derivados, nunca guardados).

Los saldos y transferencias **no se persisten**: siempre se derivan de gastos y pagos. Así no se pueden desincronizar.

## PWA y modo sin conexión

`vite-plugin-pwa` (modo `generateSW`, `registerType: 'prompt'`) genera `manifest.webmanifest` y el service worker (Workbox) en el build. El manifest está en español (`lang: es-CL`, `display: standalone`, `theme_color #F4F7F2`, `background_color #F4F7F2`). Los íconos (192, 512, maskable 512 y `apple-touch-icon` 180) están commiteados en `public/` y se regeneran desde `public/favicon.svg` con `node scripts/generate-icons.mjs` (usa Playwright para sacar la captura del SVG).

- **App shell sin conexión:** se precachean todos los assets del build (JS de cada ruta, CSS, íconos) y toda navegación cae en `index.html`, así que cualquier URL (`/groups/abc/expenses`) abre sin red. Los datos viven en `localStorage`, por eso lectura y escritura siguen funcionando.
- **Actualizaciones:** `src/app/pwa.ts` registra el service worker; cuando hay una versión nueva muestra un toast "Hay una nueva versión de Dividy" con el botón **Recargar**. No se recarga solo para no perder un formulario a medio llenar. En desarrollo (`npm run dev`) no hay service worker.
- iOS: `apple-touch-icon` y los meta `apple-mobile-web-app-*` están en `index.html`.

## Pasar a backend (futuro)

Implementar `HttpGroupRepository` con el mismo puerto, pasar los tests de contrato y cambiarlo en el provider. Probablemente convenga mover las operaciones del dominio al servidor también; como son funciones puras, se pueden reutilizar tal cual.

## API del dominio

Todo se importa desde `@/domain`. Las operaciones devuelven `Result<T>` (`{ ok: true, value }` o `{ ok: false, error: { code, message } }`, con `message` en español).

**Dinero y división**

- `isValidAmount(n)`: entero seguro entre 1 y 999.999.999.
- `formatAmount(n)`: formatea en CLP (`$10.000`).
- `computeShares(expense, members)`: parte de cada participante (`Map<MemberId, Amount>`), con el resto a los primeros según el orden del grupo. Única función que divide dinero.

**Saldos y transferencias**

- `computeBalances(group)`: `MemberBalance[]` en el orden de los miembros (`paid`, `share`, `paymentsSent`, `paymentsReceived`, `balance`).
- `getMemberBreakdown(group, memberId)`: desglose por gasto y pagos de un miembro (`null` si no existe); alimenta "¿por qué?".
- `isSettled(group)`: `true` si todos los saldos son 0.
- `isExpenseCoveredByPayments(group, expenseId)`: `true` si el gasto es un **Covered expense** (hay un pago del grupo con `createdAt` posterior al del gasto). Prefiere avisar de más.
- `previewBalanceChange(group, nextGroup)`: `BalanceChange[]` (`{ memberId, before, after }`) solo de los miembros cuyo saldo cambia, en el orden del grupo; la UI lo usa para advertir antes de editar o eliminar un gasto cubierto.
- `suggestTransfers(group)`: transferencias sugeridas (voraz, máximo n-1, siempre positivas).

**Operaciones del grupo** (inmutables)

- `createGroup({ id, name, members, now })`, `renameGroup(group, name)`, `touch(group, now)` (devuelve `Group`, actualiza `updatedAt`).
- `addMember(group, member)`, `renameMember(group, memberId, name)`.
- `getMemberRemovalImpact(group, memberId)`: gastos y pagos afectados, para la vista previa.
- `removeMember(group, memberId, strategy)`: `none`, `reassign` o `cascade`.
- `addExpense(group, input)`, `updateExpense(group, expenseId, fields)`, `removeExpense(group, expenseId)`.
- `addPayment(group, input)`, `removePayment(group, paymentId)`.

**Validación (para los formularios)**

- `validateGroupName`, `validateMemberName(group, name, exceptId?)`, `validateDescription`, `validateAmount`, `validateDate`: devuelven el valor normalizado (recortado y, en nombres y descripción, con mayúscula inicial vía `capitalizeFirst`) o el error.
- `capitalizeFirst(text)`: fuente única de la regla de mayúscula inicial; pura e idempotente.
- `validateExpenseFields(group, fields)`, `validatePaymentFields(group, fields)`: validan un gasto o pago completo.
- `getGroupIssues(group)`: lista de invariantes rotas (vacía si el grupo es válido).

**Resumen**

- `formatGroupSummary(group, { asOf?, link? })`: texto en español para pegar en un chat. Con `asOf` agrega "Cuentas al <fecha>" bajo el título (resumen de una captura) y con `link` termina con "Ver el detalle: <link>".

**Capturas** (ADR 0006)

- `createSnapshot(group, takenAt)`, `snapshotToGroup(snapshot)`, `getSnapshotIssues(snapshot)`, `decideSnapshotSave(saved, incoming)` (`'save' | 'replace' | 'same' | 'older'`), `toCompactSnapshotV1` / `fromCompactSnapshotV1` (las usa el codec del link).

## API de datos

Desde `@/data`: `GroupRepository` (`list`, `get`, `save`, `delete`), `InMemoryGroupRepository` y `LocalStorageGroupRepository({ storage?, newId?, now?, store? })`; `SnapshotRepository` (`list`, `get`, `save`, `delete`), `InMemorySnapshotRepository` y `LocalStorageSnapshotRepository` (mismas opciones), y `LocalStorageStore` para compartir el documento entre ambos. Los IDs se generan con `newId()` de `@/lib/id`. Las suites `describeGroupRepositoryContract` y `describeSnapshotRepositoryContract` (`src/data/*.contract.ts`) se ejecutan contra cada implementación de su puerto.
