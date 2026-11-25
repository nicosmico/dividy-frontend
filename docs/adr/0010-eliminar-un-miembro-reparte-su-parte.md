# Eliminar un miembro con movimientos reparte su parte entre los demás

Reemplaza al [ADR 0003](./0003-eliminar-miembro-reasignar-o-cascada.md), que ofrecía elegir entre **Reassign** (traspasar todo a otro miembro) y **Cascade delete**. Una propiedad nueva de fast-check encontró un error en "Reasignar": si se eliminaba a Beto pasando sus gastos a Carla y Carla ya participaba de un gasto en partes iguales, ese gasto quedaba "una sola vez" para Carla y un tercero perdía plata. Ejemplo: un asado de $30.000 entre Ana (que pagó), Beto y Carla; a Ana le debían $20.000 y, al reasignar Beto a Carla, pasaba a $15.000 (el gasto quedaba entre Ana y Carla a $15.000 cada una, sin que nadie lo hubiera decidido).

El dueño del producto decidió **quitar "Reasignar"**: no ve un caso real. Eliminar un miembro con movimientos es para corregir errores (lo agregaste por error o no participó). Queda **una sola regla**:

- **Gastos que pagó:** se eliminan (el pagador tiene que ser del grupo).
- **Pagos que envió o recibió:** se eliminan.
- **Gastos en que participaba** (y no pagó): **su parte se reparte en partes iguales entre los demás participantes de ese gasto**; lo de los demás no cambia salvo por esa porción.
- Si era el **único participante**, el gasto se elimina.

Cómo se reparte según la **Split** (ADR 0008):

- `equal`: se quita de los participantes y sigue en partes iguales (equivale a repartir su parte en partes iguales).
- `exact`: su monto se divide en partes iguales entre los demás (con `computeShares`, resto por el orden del grupo) y se suma al de cada uno; sigue siendo `exact`.
- `percent`: sus puntos básicos se dividen igual entre los demás (enteros, resto por el orden del grupo) y se suman; sigue siendo `percent` y suma 10000.
- `shares`: no se puede repartir media parte (y sumar fracciones daría divisiones raras, como "Ana 5 partes, Carla 3"), así que el gasto **pasa a `exact`** con el monto que a cada uno le tocaba (según `computeShares`) más su porción igual de la parte del eliminado. Quien quedaría con $0 sale de la división, porque un monto exacto debe ser mayor que cero (su parte es la misma, $0).

La división de dinero sigue pasando solo por `computeShares` (ADR 0009): `redistributeSplit` la usa para repartir la porción.

## Consequences

- El diálogo tiene un solo camino ("Eliminar a Beto"): dice cuántos gastos se reparten y cuántos se borran, lista cómo cambian las cuentas (`previewBalanceChange`) y avisa que, si Beto sí participó, mejor no eliminarlo (eliminarlo mueve plata entre los demás). "Deshacer" sigue funcionando.
- Invariante, con propiedades de fast-check: en cada gasto que sobrevive, la suma de las partes de los demás sube exactamente en la parte que tenía el eliminado y cada uno sube su porción igual (±1 unidad mínima por el resto). Con porcentajes la granularidad es de 0,01 % (un punto básico) del monto, no de una unidad mínima, por lo que ahí la tolerancia es `monto / 10000 + 2`. Quien no compartía ningún gasto ni pago con el eliminado mantiene su saldo.
- Desaparecen `reassign`, `cascade`, `reassignSplit`, `toEqualSplit` y el error `invalid_reassign_target`. `RemoveMemberStrategy` es `none` (sin movimientos) o `redistribute`.
- Los gastos por partes que cambian pasan a montos y no vuelven a partes solos; el diálogo lo avisa.
