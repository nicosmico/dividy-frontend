# La división personalizada guarda enteros y reparte el resto por el orden de los miembros

Un gasto ya no se divide solo en partes iguales. Decidimos que **Split** (División) tiene cuatro formas, todas con la misma garantía de que las partes suman el monto al peso (ADR 0001):

- `equal`: partes iguales (lo de siempre).
- `exact`: un monto entero por participante; deben sumar **exactamente** el monto del gasto.
- `percent`: un porcentaje por participante con hasta 2 decimales, guardado como **puntos básicos enteros** (100,00 % = 10000); deben sumar exactamente 10000.
- `shares`: partes enteras de al menos 1 por participante (Ana 2, Beto 1).

Cada forma lleva `participantIds` y, salvo `equal`, un registro `{ miembro: valor }` (`amounts`, `basisPoints` o `parts`).

## Decisiones

- **Puntos básicos enteros para el porcentaje.** Guardar 33,33 como número decimal reintroduce los errores de punto flotante que el ADR 0001 evita; 3333 es un entero y la suma exacta (10000) se verifica con `===`.
- **Una sola función divide.** `computeShares` sigue siendo la única que divide dinero. Para `percent` y `shares` toma el piso de la parte proporcional (aritmética entera) y reparte el resto **de a un peso según el orden de los miembros del grupo**, como en `equal`; `exact` devuelve los montos tal cual. El resto salta a quien ya tenía su proporción exacta, para que cada parte difiera de la proporcional en menos de $1 (propiedad de fast-check). Con partes iguales esto es idéntico a lo de antes.
- **Un participante con $0 o 0 % no es válido**: que lo quiten de la división. Con partes, el mínimo es 1.
- **Eliminar un miembro, reasignar:** su valor (monto, porcentaje o partes) se suma al de quien recibe; si no participaba, toma el valor del eliminado. La suma sigue cuadrando.
- **Eliminar un miembro, cascada:** una división personalizada no puede perder a alguien y seguir sumando, así que ese gasto pasa a **partes iguales** entre quienes quedan. El diálogo avisa cuántos gastos son ("2 gastos con división personalizada pasarán a partes iguales.").
- **Editar el monto** de un gasto por montos deja de cuadrar: el formulario lo muestra y no deja guardar hasta corregir. Con porcentaje y partes se recalcula solo.

## Consequences

- El documento de `localStorage` sigue en v4: el esquema solo se amplió (las tres formas nuevas se aceptan, las viejas siguen válidas), así que no hay migración. Una versión anterior de la app que leyera un documento con divisiones personalizadas mandaría esos grupos a cuarentena; es el costo de no versionar y aplica solo a quien vuelva a una versión vieja.
- El link compartido pasa a `v2` para llevar las divisiones nuevas (ADR 0006).
- Cada operación sobre un grupo (reasignar, cascada, editar) valida de nuevo con las mismas reglas, así que nunca queda un gasto que no sume.
