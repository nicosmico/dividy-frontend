# Arquitectura

Dividy es una SPA (React + Vite) sin backend. La arquitectura separa tres capas para que la lógica de dinero sea pura y testeable, y para que cambiar `localStorage` por una API sea agregar una implementación y no reescribir la app.

```
UI (React, shadcn/ui)  ──usa──▶  hooks de datos (TanStack Query)  ──usa──▶  GroupRepository (puerto)
        │                                                                         ▲
        └──────────────── usa funciones puras ──▶  domain  ◀── usa ── LocalStorageGroupRepository
```

## Capas

### `src/domain`: reglas de negocio puras

- Sin React, sin `localStorage`, sin fechas "de ahora" ni IDs aleatorios implícitos (se reciben como parámetros).
- Tipos: `Group`, `Member`, `Expense`, `Payment`, `Amount`.
- Funciones: división con resto (`computeShares`), saldos (`computeBalances`, con desglose por miembro), transferencias sugeridas (`suggestTransfers`), operaciones inmutables sobre un grupo (`addExpense`, `removeMember`…) que validan invariantes y devuelven un grupo nuevo o un error tipado, y el texto del resumen.
- Es la capa con más tests: tablas de casos y tests de propiedades.

### `src/data`: persistencia

- `GroupRepository`: interfaz **asíncrona** (`list`, `get`, `save`, `delete`). Solo guarda y recupera grupos completos; no tiene reglas de negocio.
- `LocalStorageGroupRepository`: documento `{ version, groups }` en una sola clave, con migraciones por versión y migración desde el formato antiguo.
- `InMemoryGroupRepository`: para tests.
- Tests de contrato compartidos: la misma suite corre contra cada implementación (y correrá contra una futura `HttpGroupRepository`).

### `src/app` + `src/features`: interfaz

```
src/
  app/                 main.tsx, App.tsx (BrowserRouter + repositorio real), providers.tsx
                       (QueryClient + RepositoryProvider + Toaster), router.tsx (AppRoutes),
                       AppLayout (enlace "Saltar al contenido", header + columna max-w-lg),
                       ErrorBoundary, NotFoundPage, pwa.ts (registro del service worker)
  components/          dividy-logo, theme-toggle, form-field, responsive-dialog, page-fallback
    ui/                shadcn/ui (button, input, label, card, dialog, alert-dialog, drawer,
                       dropdown-menu, radio-group, select, separator, skeleton, badge, sonner)
  features/
    groups/            data/ (hooks y contexto), components/, pages/ (GroupsPage, NewGroupPage, GroupLayout)
    members/           MembersTab, MemberAvatar (placeholder + carga diferida de dicebear), useMemberMoods (carita según el saldo, a partir de `computeBalances`), diálogos de
                       renombrar y eliminar miembro (el de eliminar solo para miembros con movimientos)
    expenses/          ExpensesTab (lista por fecha), ExpenseDialog + ExpenseForm (crear/editar/eliminar),
                       AmountInput (pesos con separador de miles), expense-form.ts (validación con el
                       dominio), expense-list.ts (orden y agrupación por fecha)
    icons/             suggestIcon (función pura) + keywords.ts (diccionario) + ENTITY_ICONS (clave → Lucide)
                       + EntityIcon (tile). Calculado al mostrar; nada se guarda (decisión 89)
    balances/          BalancesTab: SuggestedTransfers ("Marcar como pagado"), MemberBalances (desglose),
                       PaymentsList, ShareSummaryButton (compartir o copiar el resumen)
  hooks/               use-media-query, use-theme (tema claro/oscuro; ver docs/design-system.md)
  lib/                 utils (cn), dates (todayLocal, formatDate), plural, id, query-client,
                       focus (restoreFocusIfLost, MAIN_ID)
  test/                setup.ts, render-with-providers.tsx, test-providers.tsx
```

- `src/features/<feature>`: pantallas y componentes de cada área. Una feature usa el dominio para calcular y los hooks de datos para leer y escribir.
- `src/components/ui`: componentes de shadcn/ui (copiados, modificables; ADR 0005).
- `src/lib`: utilidades transversales (`cn`, fechas locales, ids).

Regla de dependencias: `domain` no importa nada del resto; `data` importa solo `domain`; la UI importa ambos. Una feature no importa archivos internos de otra feature: usa su `index.ts`. La excepción es la capa de datos de grupos, que es la base compartida: las demás features la importan desde `@/features/groups/data` (que no carga páginas, así no hay ciclos con `@/features/groups`, cuyas páginas usan `@/features/members`). Las rutas se ensamblan en `src/app/router.tsx`: `GroupLayout` carga el grupo y lo entrega a la pestaña activa por `Outlet context`.

**Carga diferida.** `router.tsx` carga cada pantalla con `React.lazy`; `AppLayout` y `GroupLayout` envuelven su `Outlet` en `Suspense` con `PageFallback` (skeleton), así el encabezado y las pestañas no parpadean al cambiar de pantalla. En los tests, la navegación a una pantalla es asíncrona: usa `waitFor` / `findBy*`.

#### Hooks de datos (`@/features/groups/data`)

- `RepositoryProvider({ repository, now?, newId? })` y `useServices()`: inyectan el `GroupRepository`, el reloj (`now(): string` ISO) y el generador de ids. En producción, `LocalStorageGroupRepository`; en tests, `InMemoryGroupRepository` con `now` y `newId` fijos.
- `useGroups()` y `useGroup(groupId)` (`data: Group | null`): queries de TanStack Query.
- `useCurrentGroup(): Group`: el grupo de la ruta, dentro de una pestaña de `GroupLayout`.
- `useGroupOperation(groupId)` → `{ run(operation), isPending }`. `operation` es una función del dominio `(group) => Result<Group>`, p. ej. `(g) => addExpense(g, input)`. `run` lee el grupo del repositorio, aplica la operación y: si el dominio falla devuelve `{ ok: false, error }` sin guardar; si funciona hace `touch(group, now())`, `repository.save` e invalida las queries (`{ ok: true, value, previous, undo }`). Si el guardado falla (por ejemplo, cuota llena) muestra un toast de error y devuelve `code: 'save_failed'`; `isInfrastructureError(error)` distingue estos casos de los errores de dominio, que el formulario muestra en línea.
- **Deshacer.** El resultado exitoso trae `previous` (el grupo antes de la operación) y `undo()`. `undo` vuelve a leer el grupo; si su `updatedAt` sigue siendo el que guardó la operación, guarda `previous`, invalida las queries y muestra "Cambio deshecho"; si cambió (o el grupo ya no existe), no toca nada y muestra "No se pudo deshacer porque el grupo cambió." Devuelve `true` o `false` y muestra sus propios toasts. `toastUndoable(mensaje, result)` muestra el toast de éxito con el botón **Deshacer** durante 6 s (`UNDO_DURATION_MS`). Se usa al eliminar un gasto, un pago o un miembro; sirve para cualquier operación. Como la comparación es por `updatedAt`, cualquier cambio posterior (de otra pestaña, por ejemplo) bloquea el deshacer en vez de pisarlo.
- `useCreateGroup()` → `{ create({ name, memberNames }), isPending }` y `useDeleteGroup()` → `{ remove(groupId): Promise<boolean>, isPending }`.

#### Piezas reutilizables

- `ResponsiveDialog({ open, onOpenChange, title, description?, children })` + `ResponsiveDialogFooter`: Drawer (vaul) bajo 768 px, Dialog desde 768 px. Se usa en todos los formularios.
- `FormField({ label, error?, hint?, children: (control) => ReactNode })`: label, mensaje de error y `aria-*`; se usa con react-hook-form (`<Input {...control} {...register('x')} />`).
- `MemberAvatar({ member, mood?: 'happy' | 'sad', decorative? })`: avatar `lorelei` generado localmente con `@dicebear/core` + `@dicebear/lorelei`, semilla = id del miembro. Dicebear solo lo importa `avatar-generator.ts`, que `avatar-uri.ts` carga con `import()` la primera vez que hace falta; mientras tanto (o si falla) se muestra un círculo del mismo tamaño con la inicial. El resultado se guarda en caché por semilla y ánimo, así que los avatares ya vistos se pintan sin parpadeo. `decorative` oculta el avatar a los lectores de pantalla cuando el nombre ya está al lado.
- `FormField({ label, error?, hint?, counter?: { length, max }, children })`: `counter` muestra "12/80" junto a la etiqueta (rojo si se pasa del máximo).
- `restoreFocusIfLost(fallback?)` (`@/lib/focus`): tras borrar algo que tenía el foco, lo mueve a `fallback` (o a `<main id="main-content">`) solo si se perdió en `<body>`.
- `ResponsiveDialog` recuerda el elemento que lo abrió y le devuelve el foco al cerrarse (Radix no puede, porque estos diálogos se abren por estado y no con un trigger); el Drawer mueve el foco al panel al abrirse (sin abrir el teclado del celular).
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

- `validateGroupName`, `validateMemberName(group, name, exceptId?)`, `validateDescription`, `validateAmount`, `validateDate`: devuelven el valor normalizado o el error.
- `validateExpenseFields(group, fields)`, `validatePaymentFields(group, fields)`: validan un gasto o pago completo.
- `getGroupIssues(group)`: lista de invariantes rotas (vacía si el grupo es válido).

**Resumen**

- `formatGroupSummary(group)`: texto en español para pegar en un chat.

## API de datos

Desde `@/data`: `GroupRepository` (`list`, `get`, `save`, `delete`), `InMemoryGroupRepository` y `LocalStorageGroupRepository({ storage?, newId?, now? })`. Los IDs se generan con `newId()` de `@/lib/id`. La suite `describeGroupRepositoryContract` (`src/data/group-repository.contract.ts`) se ejecuta contra cada implementación.
