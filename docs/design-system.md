# Design system

El design system de Dividy vive solo en el código (decisión 88): tokens semánticos en `src/index.css`, componentes de shadcn/ui en `src/components/ui/` y este documento. Hay modo claro y oscuro; el oscuro sigue al sistema y se puede forzar desde el selector del encabezado (decisión 87).

## Reglas de oro

1. **Colores solo vía tokens.** En componentes, `bg-card`, `text-muted-foreground`, `border-border`, `text-positive`... Nunca un hex ni una paleta fija de Tailwind (`zinc-900`, `amber-200`, `emerald-700`, `red-600`, `bg-white`, `bg-black/50`). Los únicos archivos que definen colores son `src/index.css` y el generador de avatares (los avatares no cambian con el tema).
2. **El menta nunca va como texto sobre blanco** (contraste 1,12:1). Es un color de relleno: fondo de botones y badges, siempre con texto navy (`accent-foreground`).
3. **El color nunca es el único portador de significado.** "Le deben" y "Debe" siempre llevan texto; el verde y el rojo solo refuerzan.
4. **Contraste AA en ambos modos**: 4,5:1 para texto normal, 3:1 para texto grande y para el borde de los controles de formulario (WCAG 1.4.11). Cada par de la tabla de abajo se calculó con la fórmula de WCAG; axe lo audita además en los E2E, en claro y en oscuro.
5. **Iconos: solo Lucide** (`lucide-react`), ver más abajo.

## Tokens

Se definen dos veces en `src/index.css` (`:root` para claro y `.dark` para oscuro) y se exponen a Tailwind con `@theme inline`. Cambiar un color es cambiar una línea ahí; ningún componente cambia.

| Token (utilidad Tailwind)                                       | Claro                 | Oscuro                | Para qué sirve                                                                                |
| --------------------------------------------------------------- | --------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| `--background` (`bg-background`)                                | `#F4F7F2`             | `#0B1730`             | Fondo de la página.                                                                           |
| `--foreground` (`text-foreground`)                              | `#10213F`             | `#ECF6E6`             | Texto principal.                                                                              |
| `--card` / `--card-foreground` (`bg-card`)                      | `#FFFFFF` / `#10213F` | `#12264A` / `#ECF6E6` | Superficie: tarjetas, filas, bottom sheets, diálogos.                                         |
| `--popover` / `--popover-foreground`                            | igual que `--card`    | igual que `--card`    | Menús y listas desplegables.                                                                  |
| `--surface-2` (`bg-surface-2`), `--secondary`, `--muted`        | `#EAF0E6`             | `#1A325C`             | Segunda superficie: pista de las pestañas, chips, resúmenes, esqueletos, hover de filas.      |
| `--muted-foreground` (`text-muted-foreground`)                  | `#5B6B82`             | `#A3B3CB`             | Texto suave: descripciones, fechas, etiquetas secundarias.                                    |
| `--border` (`border-border`, `border`)                          | `#DCE4D6`             | `#24406E`             | Bordes de tarjetas, separadores y diálogos. Decorativo: no se usa para delimitar controles.   |
| `--input` (`border-input`)                                      | `#7F8FA6`             | `#5F7DAE`             | Borde de inputs, selects, checkboxes y radios (3:1 como mínimo contra su fondo).              |
| `--field` (`bg-field`)                                          | `#FFFFFF`             | `#0F2140`             | Fondo de los campos de formulario.                                                            |
| `--primary` / `--primary-foreground` (`bg-primary`)             | `#14305F` / `#D6FEC2` | `#D6FEC2` / `#0B1730` | Botón principal, checkbox marcado, enlaces y acciones de texto.                               |
| `--accent` / `--accent-foreground` (`bg-accent`)                | `#D6FEC2` / `#14305F` | `#D6FEC2` / `#0B1730` | Relleno de acento: badge "Al día", "Marcar como pagado", pasos de la bienvenida, avisos.      |
| `--positive` (`text-positive`)                                  | `#1E7B3C`             | `#86E3A4`             | Saldo a favor ("Le deben").                                                                   |
| `--negative` (`text-negative`, `border-negative`)               | `#B3261E`             | `#FF9C90`             | Saldo en contra ("Debe"), errores de formulario, "Pendiente", acciones destructivas en texto. |
| `--negative-border` (`border-negative-border`)                  | `#F0C3BE`             | `#6B3340`             | Borde suave del badge "Pendiente".                                                            |
| `--destructive` / `--destructive-foreground` (`bg-destructive`) | `#C62F25` / `#FFFFFF` | igual                 | Fondo de los botones destructivos (Eliminar). Para texto rojo usa `--negative`.               |
| `--ring` (`ring-ring`, `border-ring`)                           | `#14305F`             | `#D6FEC2`             | Color del foco.                                                                               |
| `--ring-soft` (`ring-ring-soft`)                                | primario al 15 %      | primario al 20 %      | Halo de 3 px alrededor de un campo con foco.                                                  |
| `--tab-active` / `--tab-active-foreground`                      | `#FFFFFF` / `#14305F` | `#1F3B6B` / `#ECF6E6` | Pestaña activa.                                                                               |
| `--brand` (`text-brand`)                                        | `#14305F`             | `#ECF6E6`             | Texto "Dividy" del encabezado.                                                                |
| `--logo-bg` / `--logo-fg` (`fill-logo-bg`, `fill-logo-fg`)      | `#14305F` / `#D6FEC2` | `#D6FEC2` / `#14305F` | Cuadrado y símbolo del logo.                                                                  |
| `--toast` / `--toast-foreground`                                | `#14305F` / `#ECF6E6` | `#ECF6E6` / `#0B1730` | Fondo y texto de los avisos (toasts).                                                         |
| `--toast-action` / `--toast-action-foreground`                  | `#D6FEC2` / `#14305F` | `#14305F` / `#D6FEC2` | Botón "Deshacer" del aviso.                                                                   |
| `--overlay` (`bg-overlay`)                                      | navy al 45 %          | casi negro al 60 %    | Fondo oscurecido detrás de sheets y diálogos.                                                 |
| `--elevation` (`shadow-soft`), `--elevation-pop` (`shadow-pop`) | sombras suaves navy   | `none` / sombra negra | Elevación (ver "Sombras").                                                                    |

### Contrastes mínimos

Razón de contraste WCAG calculada para los pares que usa la app. El mínimo es 4,5:1 para texto y 3:1 para bordes de controles y texto grande.

| Par                                              | Claro           | Oscuro          |
| ------------------------------------------------ | --------------- | --------------- |
| Texto sobre fondo                                | 14,8            | 16,0            |
| Texto sobre superficie                           | 16,0            | 13,5            |
| Texto suave sobre fondo                          | 5,0             | 8,4             |
| Texto suave sobre superficie                     | 5,4             | 7,0             |
| Texto suave sobre superficie 2 (pestañas)        | 4,7             | 6,0             |
| Texto sobre primario (botón principal)           | 11,6            | 15,9            |
| Texto sobre acento                               | 11,6            | 15,9            |
| Positivo sobre superficie / fondo                | 5,3 / 4,9       | 9,7 / 8,4       |
| Negativo sobre superficie / fondo / superficie 2 | 6,5 / 6,1 / 5,6 | 7,4 / 8,8 / 6,3 |
| Texto blanco sobre destructivo                   | 5,5             | 5,5             |
| Pestaña activa                                   | 13,0            | 10,0            |
| Aviso (toast) y su botón                         | 11,7 / 11,6     | 16,0 / 11,6     |
| Borde de campo sobre su fondo (mínimo 3:1)       | 3,0 – 3,3       | 3,6 – 4,3       |
| Foco (`--ring`) sobre superficie                 | 13,0            | 13,4            |

Si cambias un token, recalcula los pares que lo usan y corre `npm run test:e2e` (la auditoría axe corre en claro y en oscuro).

## Tipografía

- **Fuente del sistema**: `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` (definida en `body`). No se descargan fuentes: la app carga rápido y funciona sin conexión.
- **Escala** (la que ya usa la app, de Tailwind):

| Clase                   | Tamaño | Uso                                                                 |
| ----------------------- | ------ | ------------------------------------------------------------------- |
| `text-3xl font-bold`    | 30 px  | Total del grupo.                                                    |
| `text-2xl font-bold`    | 24 px  | Título de pantalla (`h1`).                                          |
| `text-xl`               | 20 px  | Logo "Dividy", monto de una transferencia, título de la bienvenida. |
| `text-lg font-semibold` | 18 px  | Nombre y total de una tarjeta de grupo, títulos de diálogos.        |
| `text-base`             | 16 px  | Texto de campos en móvil (16 px evita el zoom de iOS al enfocar).   |
| `text-sm`               | 14 px  | Texto de interfaz: botones, filas, descripciones, etiquetas.        |
| `text-xs`               | 12 px  | Badges y datos secundarios (fecha de actualización).                |

- Pesos: `font-medium` (500) para etiquetas, `font-semibold` (600) para botones y títulos pequeños, `font-bold` (700) y `font-extrabold` (800) para títulos y el logo.
- Los montos en pesos llevan `tabular-nums` para que las cifras se alineen.

## Espaciado, radios y sombras

- **Espaciado**: escala de 4 px de Tailwind. Columna central `max-w-lg` con gutter `px-4` (16 px). Entre bloques `gap-4`; dentro de una tarjeta `gap-3`/`gap-4`.
- **Radios**, como utilidades de Tailwind definidas en `@theme`:

| Utilidad        | Valor  | Uso                                        |
| --------------- | ------ | ------------------------------------------ |
| `rounded-full`  | 999 px | Botones, pestañas, badges, avatares.       |
| `rounded-field` | 14 px  | Inputs, textareas, selects.                |
| `rounded-tile`  | 18 px  | Tarjetas de lista, filas de saldo, `Card`. |
| `rounded-card`  | 22 px  | Tarjetas de grupo, diálogos.               |
| `rounded-sheet` | 28 px  | Esquinas superiores de los bottom sheets.  |

- **Sombras**: `shadow-soft` para tarjetas y la pestaña activa, `shadow-pop` para menús, diálogos, sheets y avisos. En modo oscuro `shadow-soft` es `none`: las sombras no se ven sobre un fondo oscuro, así que ahí separan los **bordes** (`--border`) y el cambio de superficie. No pongas sombras a botones ni a campos.
- **Tamaños táctiles ≥ 44 px**: botones e inputs miden `h-11` (44 px) o más (`lg` 48 px); los botones de ícono son `size-11`; las pestañas miden 44 px de alto dentro de su pista; los ítems de menú, `min-h-11`; el botón "Deshacer" del aviso, 44 px. Las acciones de texto "Todos" / "Ninguno" del formulario de gasto son la excepción conocida (36 px).
- **Foco**: los campos cambian el borde a `--ring` y suman un halo `ring-[3px] ring-ring-soft`; los demás controles (botones, enlaces, pestañas) usan `ring-[3px] ring-ring/40`. Nunca quites el foco sin reemplazarlo (`e2e/keyboard.spec.ts` lo comprueba).
- Se respeta `prefers-reduced-motion` (regla global en `index.css`).

## Modo claro y oscuro

- `useTheme()` (`src/hooks/use-theme.ts`) devuelve `{ theme, resolvedTheme, setTheme }`. `theme` es la elección (`system`, `light` o `dark`); `resolvedTheme`, lo que se está mostrando.
- La elección se guarda en `localStorage` (clave `dividy-theme`, todo en `try/catch`) y se aplica con la clase `dark` en `<html>`. "Sistema" no guarda nada y reacciona en vivo a `prefers-color-scheme`.
- Un script inline en `index.html` aplica la clase antes de que React monte, para que no haya destello. Si cambias la clave, cámbiala en ambos lugares (un test lo verifica).
- `<meta name="theme-color">` tiene una versión para claro (`#F4F7F2`) y otra para oscuro (`#0B1730`), con `media`; al elegir un tema a mano, `useTheme` iguala ambas. El `theme_color` del manifest es el del modo claro, porque un manifest no puede depender del tema.
- Para ver el modo oscuro en pruebas E2E: `test.use({ colorScheme: 'dark' })` o `page.emulateMedia({ colorScheme: 'dark' })`.

## Logo

Cuadrado redondeado con el símbolo de división girado 45° (una diagonal y dos puntos). Claro: cuadrado navy `#14305F`, símbolo menta `#D6FEC2`. Oscuro: invertido. El componente `DividyLogo` lo dibuja con los tokens `--logo-bg` y `--logo-fg`; `public/favicon.svg` es el mismo dibujo con la versión navy y colores fijos (es la del ícono de la app). Si cambias el logo, regenera los PNG de la PWA con `PW_CHROMIUM_PATH=/ruta/a/chrome node scripts/generate-icons.mjs`.

## Íconos

- **Lucide** (`lucide-react`) es la única librería de íconos. No mezcles otra ni dibujes SVG sueltos (el logo es la excepción).
- Trazo por defecto de Lucide (2 px, esquinas redondeadas); no cambies `strokeWidth`. Tamaño `size-4` dentro de botones y menús (lo aplica `Button`), `size-5` para íconos de acción sola.
- **Decorativos con `aria-hidden='true'`** (el texto de al lado ya dice lo mismo). Si el ícono es lo único que hay en un botón, el botón lleva `aria-label` (por ejemplo, el selector de tema: "Tema de colores").
- Los íconos heredan el color del texto (`currentColor`): no les pongas color propio salvo con un token.

## Cómo agregar un componente de shadcn

1. `npx shadcn@latest add <componente>`. Se instala en `src/components/ui/`.
2. **Reemplaza todo color suelto por un token** antes de commitear. El CLI genera clases de la paleta (`bg-zinc-…`, `text-white`, `bg-black/50`, `text-destructive` para texto, `shadow-lg`). Equivalencias:

| Si trae…                                  | Usa…                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `bg-white`, `bg-background` en superficie | `bg-card`                                                                 |
| `bg-black/50` (fondo de overlay)          | `bg-overlay`                                                              |
| `text-white` sobre rojo                   | `text-destructive-foreground`                                             |
| texto o borde rojo                        | `text-negative`, `border-negative`                                        |
| `bg-gray-100`, `bg-muted` en hover        | `bg-secondary`                                                            |
| `border-input` en un campo                | se mantiene (`--input`); el fondo, `bg-field`                             |
| `shadow-sm`, `shadow-lg`                  | `shadow-soft` (tarjetas) o `shadow-pop` (flotantes)                       |
| `rounded-md`, `rounded-xl` en campos      | `rounded-field`; botones y badges `rounded-full`; tarjetas `rounded-tile` |
| `focus-visible:ring-ring/50`              | el patrón de foco de arriba                                               |

3. Respeta los tamaños táctiles (`h-11`, `min-h-11`) y los íconos (Lucide, `aria-hidden`).
4. Si necesitas un color nuevo que ningún token cubre, agrégalo como token en `:root` **y** en `.dark` de `index.css`, expónlo en `@theme inline` y documéntalo en la tabla de arriba; no lo escribas en el componente. Un componente con lógica lleva test, y toda pantalla o diálogo nuevo se agrega a `e2e/a11y.spec.ts` (que ya corre en ambos modos).
5. Verifica: `grep -rnE "(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]|#[0-9a-fA-F]{3,8}\b|(bg|text|border)-(white|black)\b" src --include=*.tsx --include=*.ts | grep -v "src/index.css\|avatar-generator"` no debe imprimir nada.
