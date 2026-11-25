# Transferencias sugeridas: mínimo y amables

**Estado:** vigente. Reemplaza al [ADR 0004](./0004-algoritmo-de-transferencias-sugeridas.md).

El ADR 0004 usaba un algoritmo voraz (el mayor deudor paga al mayor acreedor). Garantizaba a lo más `n - 1` transferencias, pero a veces partía el pago de alguien que debía poco y dejaba transferencias chicas. Caso real, Casa Marcelo (saldos Nico +10.266, Marcelo +31.667, Kevin −22.333, Nati −9.800, Jorge −2.200, Pauli −7.600): el voraz sugería Jorge→Marcelo $1.734 y Jorge→Nico $466. Son 5 transferencias, el mínimo, pero Jorge, que debe poco, parte su pago y una transferencia es de $466.

## Decisión

El algoritmo sigue siendo una función pura sobre enteros (en la unidad mínima de la moneda, ADR 0009) y determinista, con dos pasos:

1. **Grupos que se saldan solos.** Con los saldos distintos de 0 se busca la partición en la mayor cantidad posible de subgrupos cuya suma es 0 (programación dinámica sobre máscaras de bits, `O(2^n · n)`). Cada subgrupo se salda por su cuenta, así que el total es (personas con saldo) − (subgrupos), que es el **mínimo** posible. Si hay más de **15** personas con saldo, el paso se salta y todos forman un solo grupo (a lo más `n - 1`, como antes); el límite mantiene el cálculo instantáneo (15 personas: pocos milisegundos).
2. **Dentro de cada subgrupo.** Los deudores van de menor a mayor deuda. Cada uno paga **entero** al acreedor con **más** saldo pendiente que pueda recibirlo entero. Si ninguno puede, reparte su pago entre los acreedores de mayor a menor saldo pendiente. Los desempates siguen el orden del grupo. Cada transferencia deja en 0 a un deudor o a un acreedor, así que un subgrupo de `k` personas usa a lo más `k - 1`.

La lista sale ordenada de mayor a menor deuda de quien paga (desempate por orden del grupo), el mismo criterio de antes: el mayor deudor primero.

Casa Marcelo queda: Kevin→Marcelo $12.067, Kevin→Nico $10.266, Nati→Marcelo $9.800, Pauli→Marcelo $7.600, Jorge→Marcelo $2.200. Siguen siendo 5; solo parte su pago Kevin, que es quien más debe, y no hay montos chicos.

## Consecuencias

- Nunca hay más transferencias que con el voraz (hasta 15 personas con saldo, porque el paso 1 da el mínimo); con más de 15 se mantiene el tope `n - 1`, que el voraz también tenía, aunque ahí el voraz podría usar menos si el grupo se salda en subgrupos.
- Parte su pago, en general, quien más debe, pero no solo uno: si ningún acreedor puede recibir entera la deuda de un deudor, tampoco la de uno que debe más (los deudores se procesan de menor a mayor). Por ejemplo, acreedores 5, 5, 5, 5 y deudores 7 y 13: ambos reparten, y 5 transferencias sigue siendo el mínimo.
- Los resultados cambian respecto del ADR 0004 (mismas o menos transferencias, otro reparto), por lo que los tests con transferencias concretas se actualizaron. No cambia ningún formato guardado ni el link compartido.
