# El dinero se representa en pesos enteros y el resto se reparte de forma determinística

Dividy calculaba con `number` de punto flotante (10.000 / 3 = 3333,33…), lo que producía saldos que no cuadraban al peso y transferencias fantasma de "$0". Decidimos que todo **Amount** es un entero de CLP (`Number.isSafeInteger`, sin decimales) y que la división en partes iguales reparte el **Remainder** de a un peso a los primeros participantes, según el orden de los miembros en el grupo. Así la suma de las partes es siempre exactamente el monto del gasto y el resultado es reproducible.

## Consequences

- Si se agregan monedas con decimales, el monto pasará a expresarse en la unidad mínima de cada moneda (centavos), no en `number` con decimales. Por eso el grupo guarda su moneda (`'CLP'`) desde ya.
- Nunca usar división de punto flotante para dinero fuera del módulo de dominio que reparte partes.
