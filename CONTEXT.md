# Dividy

Dividy ayuda a un grupo de personas a registrar gastos compartidos y a saber, con números que cuadran al peso, quién le debe cuánto a quién.

Los términos canónicos están en inglés (así aparecen en el código); entre paréntesis va la palabra que ve el usuario en la interfaz.

## Language

### Grupo y personas

**Group** (Grupo):
Conjunto de personas que comparten gastos en un contexto acotado (un viaje, un asado, la casa). Es la unidad que contiene miembros, gastos y pagos, y la que se comparte (como Snapshot de solo lectura; compartirla para editar entre todos requiere backend).
_Avoid_: Session, event, split, cuenta

**Member** (Miembro):
Una persona dentro de un grupo. Existe solo dentro de su grupo; la misma persona en dos grupos son dos miembros distintos.
_Avoid_: User, participant (cuando se habla del grupo), friend

**Avatar** (Cara):
La carita ilustrada de un miembro: un color de fondo (uno de 8 pasteles, índice 0 a 7) y una semilla que decide la cara. Se guardan en el miembro, así que nadie cambia de cara por sí solo. El color es el primer libre del grupo al crearse (si los 8 están ocupados, vuelve a empezar en orden) y no cambia si se elimina a otro; la semilla empieza siendo el id del miembro y "Cambiar avatar" genera otra. El humor (feliz o triste) no se guarda: sale del saldo.
_Avoid_: Foto, imagen de perfil

**Viewer** (tú):
El miembro que es quien usa la app en este celular, en un grupo o en una captura. Es una preferencia del dispositivo, no un dato del grupo: ni el grupo ni el link compartido la llevan (quien abre un link elige por sí mismo). Puede ser también "nadie" (`none`: "No soy parte de este grupo" / "Solo estoy mirando"). Con ella la app muestra primero lo tuyo y escribe "(tú)" junto al nombre. Cuando haya backend pasará a ser la cuenta de ese miembro.
_Avoid_: Owner, usuario, current user

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
La regla que dice cuánto le corresponde a cada participante de un gasto. Tiene cuatro formas: **iguales** (`equal`, por defecto), **por montos** (`exact`: un monto por participante, en la unidad mínima de la moneda, que suman exactamente el monto del gasto), **por porcentaje** (`percent`: un porcentaje con hasta 2 decimales por participante, guardado en puntos básicos enteros, 100,00 % = 10000, que suman 10000) y **por partes** (`shares`: partes enteras de al menos 1 por participante, p. ej. Ana 2 y Beto 1). Las tres últimas se llaman "división personalizada". Solo `computeShares` convierte una división en partes.
_Avoid_: Distribution, prorrateo

**Share** (Parte; en Saldos, "Su parte"):
El monto, en unidades mínimas enteras de la moneda del grupo, que le corresponde a un participante en un gasto. La suma de las partes de un gasto es exactamente su monto.
_Avoid_: Portion, cuota, splitAmount

**Remainder** (Resto):
Las unidades mínimas (pesos en CLP, centavos en USD) que sobran cuando un monto no se divide exacto entre los participantes (en partes iguales, por porcentaje o por partes: la división por montos no deja resto); se asignan de a una unidad mínima a los primeros participantes según el orden de los miembros del grupo, saltándose a quien ya tenía su proporción exacta, para que ninguna parte se aleje una unidad mínima o más de la proporcional.

**Filter** (Filtro):
Lo que acota la lista de Gastos para ver solo una parte: un chip a la vez ("Donde participo", "Pagué yo" o una persona, donde participa o lo que pagó) y, con más de 10 gastos, una búsqueda por palabras en la descripción. Es una vista, no un dato: no cambia el grupo, vive en la URL (`?f=` y `?q=`) y el total de arriba la sigue. "Donde participo" y "Pagué yo" necesitan saber quién eres (**Viewer**).
_Avoid_: Segment, categoría

### Saldos y pagos

**Balance** (Saldo):
Lo que un miembro gastó en el grupo ("Gastó": lo que pagó en gastos) menos su parte ("Su parte"), más los pagos que envió y menos los que recibió. En la interfaz se dice en palabras: "Le deben $X", "Debe $X" o "Al día". Positivo: le deben. Negativo: debe. La suma de los saldos de un grupo siempre es cero.
_Avoid_: Debt (para el saldo neto), total

**Suggested Transfer** (Transferencia sugerida; la sección de Saldos se llama "Para quedar al día"):
Un movimiento de dinero entre dos miembros que Dividy propone para dejar los saldos en cero ("Ana le transfiere $X a Beto"). Es un cálculo, no algo que ocurrió.
_Avoid_: Simplified debt, transaction, deuda simplificada

**Payment** (Pago):
Dinero que un miembro efectivamente le transfirió a otro para saldar deudas. Se registra (por ejemplo, al marcar una transferencia sugerida como pagada) y afecta los saldos. En el desglose de un miembro aparecen como "Más los pagos que envió" y "Menos los pagos que recibió"; nunca se mezclan con "Gastó", que es solo lo que pagó en gastos.
_Avoid_: Settlement, transfer (para el hecho registrado), reembolso

**Covered expense** (Gasto ya saldado):
Gasto que ya existía cuando se registró algún pago del grupo (hay un pago creado después que él). Editarlo o eliminarlo puede cambiar saldos que la gente ya dio por cerrados, por eso la app avisa antes.
_Avoid_: Closed expense, gasto cerrado

**Settled** (Al día):
Estado de un grupo en que todos los saldos son cero.

**Summary** (Resumen):
Texto que resume miembros, gastos y transferencias sugeridas de un grupo, pensado para pegarlo en un chat.

### Compartir

**Snapshot** (Captura):
Copia fija de un grupo en un momento (`takenAt`): nombre, miembros con su cara, gastos y pagos. Se abre con un link y solo se puede mirar; los cambios que se hagan después en el grupo original no aparecen. Se identifica por el grupo del que salió (`sourceGroupId`); de cada grupo se guarda a lo más la captura más nueva. Vive aparte de los grupos propios ("Compartidos conmigo · solo lectura").
_Avoid_: Copia, export, backup

### Eliminar miembros

**Activity** (Movimientos):
Los gastos que un miembro pagó o en los que participa, y los pagos que envió o recibió. Un miembro sin movimientos se puede eliminar directo.
_Avoid_: History, historial

**Reassign** (Reasignar):
Al eliminar un miembro con gastos o pagos, traspasar todas sus apariciones (como pagador, participante o en pagos) a otro miembro del grupo. En una división personalizada, su monto, porcentaje o partes se suman a los de quien recibe (o los toma, si no participaba).

**Cascade delete** (Eliminar con sus gastos y pagos):
Al eliminar un miembro, borrar los gastos que pagó y sus pagos, y quitarlo de los gastos donde participa. Las partes de los demás cambian. Si participaba en un gasto con división personalizada, ese gasto pasa a partes iguales entre quienes quedan (el diálogo lo avisa).

### Dinero

**Amount** (Monto):
Cantidad de dinero como entero en la **unidad mínima de la moneda del grupo** (pesos en CLP, centavos en USD): nunca hay decimales guardados, solo al mostrar o escribir un monto (ADR 0009). Siempre mayor que cero en gastos y pagos.
_Avoid_: Total, price, precio

**Currency** (Moneda):
La moneda del grupo, elegida al crearlo (CLP, USD, EUR, ARS, BRL, PEN, MXN, COP o GBP; lista cerrada). Todos los gastos y pagos del grupo están en ella y no hay conversión. Define cuántos decimales se muestran (0 o 2) y cuál es la unidad mínima en que se guarda cada **Amount**. Solo se puede cambiar mientras el grupo no tiene gastos ni pagos.
_Avoid_: Divisa, tipo de cambio, moneda por gasto
