# Eliminar un miembro con movimientos obliga a elegir entre reasignar o eliminar en cascada

Antes, eliminar un miembro borraba en silencio sus gastos y lo quitaba de los demás, pudiendo dejar gastos sin participantes (dinero que desaparecía). Decidimos que si el miembro no aparece en ningún gasto ni pago se elimina directo; si aparece, el usuario debe elegir entre **Reassign** (traspasar todo a otro miembro) o **Cascade delete** (borrar sus gastos y pagos, quitarlo como participante y borrar los gastos que queden sin participantes), viendo antes qué gastos se ven afectados.

## Consequences

- Al reasignar, si el miembro destino ya participaba de un gasto, queda una sola vez. Los pagos que quedarían de una persona a sí misma se eliminan.
- Ambas operaciones son funciones puras del dominio con tests, no lógica en la UI.
