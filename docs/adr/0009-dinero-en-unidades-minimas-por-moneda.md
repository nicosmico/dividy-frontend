# Dinero en unidades mínimas por moneda

**Estado:** vigente. Reemplaza al [ADR 0001](./0001-dinero-en-pesos-enteros.md).

El ADR 0001 decidió que todo **Amount** es un entero de pesos chilenos. Con monedas por grupo (Fase 4, ítem 7) esa regla se generaliza sin perder lo que la hacía buena: un **Amount** sigue siendo un **entero seguro** (`Number.isSafeInteger`), pero ahora en la **unidad mínima de la moneda del grupo**: pesos para CLP, centavos para USD. En memoria, en `localStorage` y en el link nunca hay decimales ni `number` de punto flotante para dinero; los decimales solo existen cuando un monto se **muestra** o se **escribe**.

## Decisiones

- **La moneda es del grupo.** Se elige al crear el grupo (`Group.currency`, que ya existía y valía siempre `'CLP'`) y todos sus gastos y pagos están en ella. No hay moneda por gasto y **no hay conversión** entre monedas.
- **Lista cerrada y ordenada** (`CURRENCIES` en `src/domain/currency.ts`): CLP (0 decimales), USD (2), EUR (2), ARS (2), BRL (2), PEN (2), MXN (2), COP (0) y GBP (2), cada una con su nombre en español ("Peso chileno", "Dólar estadounidense", "Euro", "Peso argentino", "Real brasileño", "Sol peruano", "Peso mexicano", "Peso colombiano", "Libra esterlina") y el nombre de su unidad mínima ("peso", "centavo", "céntimo", "penique"). **COP tiene 0 decimales en la app a propósito:** ISO 4217 le da 2, pero en la práctica no se usan centavos de peso colombiano, y tratarlo como CLP deja la entrada de montos igual de simple.
- **Solo se cambia sin gastos ni pagos.** `canChangeCurrency(group)` es `expenses.length === 0 && payments.length === 0` y `changeCurrency` devuelve el error `currency_locked` ("Para cambiar la moneda, el grupo no puede tener gastos ni pagos.") en cualquier otro caso (elegir la misma moneda no es un cambio y siempre se acepta). Como no hay conversión, cambiarla con montos guardados los reinterpretaría ($12.000 pasarían a ser US$120,00); por eso la regla vive en el dominio y la interfaz solo la refleja deshabilitando el selector con esa misma frase.
- **La división opera en unidades mínimas.** `computeShares` sigue siendo la única función que divide dinero: el piso de la parte proporcional y el resto repartido **de a 1 unidad mínima** a los primeros participantes según el orden del grupo (ADR 0008, sin cambios). Con USD, 10,01 entre 3 son 3,34 / 3,34 / 3,33. Las propiedades de fast-check corren con monedas de 0 y de 2 decimales (`groupArb` elige la moneda): la suma es exacta, nada es negativo y cada parte difiere de la proporcional en menos de una unidad mínima.
- **Un solo formato** (`formatAmount(amount, currency)` en `src/domain/money.ts`): `Intl.NumberFormat('es-CL', { style: 'currency', currency })` con los decimales de la tabla. CLP queda exactamente como hoy (`$12.000`); el resto es lo que entregue `Intl` para es-CL, sin inventar símbolos (USD `US$12,50`; EUR, ARS, BRL, PEN, MXN, COP y GBP salen con su código, p. ej. `EUR 12,50`). La función exige la moneda (no hay valor por defecto), así que el compilador encuentra cualquier lugar que quede con "$" fijo. El prefijo del campo de monto sale de `currencySymbol` (`formatToParts`).
- **Entrada en formato chileno** (`parseAmountText`): los puntos agrupan miles y la coma separa los decimales ("1.234,56"). Una moneda sin decimales no los acepta y dice qué hacer ("El peso chileno no usa decimales."); con 2 decimales se aceptan como máximo 2 ("El dólar estadounidense admite hasta 2 decimales."). Escribir un punto al final en una moneda con decimales se toma como la coma de otros teclados.
- **Rango.** `MIN_AMOUNT = 1` y `MAX_AMOUNT = 999.999.999` ahora **en unidades mínimas**: $999.999.999 en CLP y US$9.999.999,99 en USD. Es el mismo número, lo que mantiene el límite seguro para BigInt y los links, y el mensaje de error dice el rango en la moneda del grupo.

## Consecuencias

- **No cambia nada para los grupos existentes**, que son CLP: sus montos ya estaban en la unidad mínima de su moneda.
- **El documento de `localStorage` sigue en v4.** `currency` ya se guardaba; el esquema pasó de `z.literal('CLP')` a `z.enum` de las nueve monedas, así que todo lo guardado sigue siendo válido y no hay migración que escribir ni que revertir. Las capturas guardadas antes (sin `currency`) se leen como CLP (`default` en `snapshotSchema`). Costo, igual que con las divisiones personalizadas (ADR 0008): una versión anterior de la app que lea un grupo en otra moneda lo manda a cuarentena; solo ocurre al volver a una versión vieja.
- **El link compartido pasa a `v3.`** y lleva la moneda (ADR 0006); los links `v1.` y `v2.` siguen abriendo y se leen como CLP.
- Los textos que decían "pesos" nombran la moneda o hablan de "monto": el campo es "Monto"; el redondeo dice "le toca US$0,01 más" (en CLP, "le toca $1 más", igual que antes) y los errores de división por montos nombran la unidad de la moneda del grupo.
- **Un grupo en otra moneda no se puede mezclar con uno en CLP**: no hay totales entre grupos ni conversión, y la tarjeta de Mis grupos muestra el código de la moneda (si no es CLP) junto al total para que no se confunda.

## Considered Options

- **`number` con decimales y redondeo al mostrar.** Reintroduce los saldos que no cuadran que el ADR 0001 eliminó. Descartado.
- **Moneda por gasto (con conversión).** Exige tipos de cambio, fecha de cada cambio y decidir en qué moneda se saldan las deudas; es un producto distinto. Descartado: la moneda es del grupo y no hay conversión.
- **Subir el documento a v5 "por si acaso".** `currency` ya existía y el cambio solo amplía lo aceptado; subir la versión sin cambiar los datos obligaría a una migración vacía.
- **Usar `Intl` con los decimales por defecto de cada moneda.** COP saldría con 2 decimales y el resultado dependería de la versión de ICU del navegador; la tabla del dominio es la fuente de verdad y se le pasan a `Intl` los decimales explícitos.
