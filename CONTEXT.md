# Dividy

Dividy ayuda a un grupo de personas a registrar gastos compartidos y a saber, con números que cuadran al peso, quién le debe cuánto a quién.

Los términos canónicos están en inglés (así aparecen en el código); entre paréntesis va la palabra que ve el usuario en la interfaz.

## Language

### Grupo y personas

**Group** (Grupo):
Conjunto de personas que comparten gastos en un contexto acotado (un viaje, un asado, la casa). Es la unidad que contiene miembros, gastos y pagos, y la que en el futuro se compartirá.
_Avoid_: Session, event, split, cuenta

**Member** (Miembro):
Una persona dentro de un grupo. Existe solo dentro de su grupo; la misma persona en dos grupos son dos miembros distintos.
_Avoid_: User, participant (cuando se habla del grupo), friend

### Gastos

**Expense** (Gasto):
Algo que un miembro pagó y que se reparte entre uno o más miembros del mismo grupo.
_Avoid_: Bill, boleta, compra, transaction

**Payer** (Pagado por):
El miembro que desembolsó el dinero de un gasto. No necesita estar entre los participantes.
_Avoid_: Owner, paidBy (solo en código)

**Participant** (Dividir entre):
Miembro entre quienes se reparte un gasto. Un gasto tiene al menos un participante.
_Avoid_: Debtor, member (para este rol)

**Split** (División):
La regla que dice cuánto le corresponde a cada participante de un gasto. Por ahora solo existe la división en partes iguales.
_Avoid_: Distribution, prorrateo

**Share** (Parte):
El monto, en pesos enteros, que le corresponde a un participante en un gasto. La suma de las partes de un gasto es exactamente su monto.
_Avoid_: Portion, cuota, splitAmount

**Remainder** (Resto):
Los pesos que sobran cuando un monto no se divide exacto entre los participantes; se asignan de a un peso a los primeros participantes según el orden de los miembros del grupo.

### Saldos y pagos

**Balance** (Saldo):
Lo que un miembro ha puesto menos lo que le corresponde, considerando gastos y pagos. Positivo: le deben. Negativo: debe. La suma de los saldos de un grupo siempre es cero.
_Avoid_: Debt (para el saldo neto), total

**Suggested Transfer** (Transferencia sugerida):
Un movimiento de dinero entre dos miembros que Dividy propone para dejar los saldos en cero. Es un cálculo, no algo que ocurrió.
_Avoid_: Simplified debt, transaction, deuda simplificada

**Payment** (Pago):
Dinero que un miembro efectivamente le transfirió a otro para saldar deudas. Se registra (por ejemplo, al marcar una transferencia sugerida como pagada) y afecta los saldos.
_Avoid_: Settlement, transfer (para el hecho registrado), reembolso

**Settled** (Al día):
Estado de un grupo en que todos los saldos son cero.

**Summary** (Resumen):
Texto que resume miembros, gastos y transferencias sugeridas de un grupo, pensado para pegarlo en un chat.

### Eliminar miembros

**Reassign** (Reasignar):
Al eliminar un miembro con gastos o pagos, traspasar todas sus apariciones (como pagador, participante o en pagos) a otro miembro del grupo.

**Cascade delete** (Eliminar con sus gastos):
Al eliminar un miembro, borrar los gastos que pagó y sus pagos, y quitarlo de los gastos donde participa. Las partes de los demás cambian.

### Dinero

**Amount** (Monto):
Cantidad de dinero en pesos chilenos enteros (CLP no usa decimales). Siempre mayor que cero en gastos y pagos.
_Avoid_: Total, price, precio
