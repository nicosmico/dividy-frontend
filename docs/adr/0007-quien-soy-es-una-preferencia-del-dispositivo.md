# "Quién soy" es una preferencia del dispositivo, guardada fuera del grupo y de la captura

Dividy muestra primero lo tuyo (titular de Saldos, transferencias, gráfico y saldos) cuando sabe qué **Viewer** ("tú") eres en un grupo o en una captura. Decidimos que esa elección **no es un dato del grupo**: se guarda solo en el celular, en su propia clave de `localStorage` (`dividy.viewers`), detrás de un puerto asíncrono `ViewerRepository` (ADR 0002).

## Qué se guarda

```json
{
  "version": 1,
  "choices": {
    "group:abc": { "memberId": "m1" },
    "snapshot:abc": { "none": true }
  }
}
```

- Una entrada por ámbito: `group:<groupId>` para un grupo propio y `snapshot:<sourceGroupId>` para una captura. Sin entrada, aún no se preguntó.
- El valor es `{ memberId }` o `{ none: true }` ("No soy parte de este grupo" en grupos propios, "Solo estoy mirando" en capturas).
- **El prefijo del ámbito es necesario.** El `sourceGroupId` de una captura es el id del grupo del que salió. Si abres en el mismo celular el link de un grupo tuyo, ambos compartirían clave, y la elección de uno (ids reales) se limpiaría al no encontrar ese miembro en el otro (ids por posición, `m0`, `m1`...).
- Si el miembro elegido ya no existe (se eliminó, o no está en la captura) se trata como "aún no se preguntó" (`resolveViewer`, en el dominio) y se limpia. Al eliminar un miembro con reasignar, la marca **no** pasa a quien recibe sus gastos: se vuelve a preguntar.
- Eliminar un grupo borra su elección. Eliminar una captura no: si la vuelves a abrir, recuerdas quién eras.

## Por qué fuera del grupo

- **No viaja.** El link compartido (ADR 0006) es una captura del grupo, igual para todos; quien lo abre elige por sí mismo. Si "quién soy" estuviera en el grupo o en la captura, compartirlo diría quién eres tú en el grupo del otro.
- **Es del dispositivo.** Cuando haya backend (Fase 5), pasará a ser "la cuenta de este miembro" sin migrar grupos: el puerto se reemplaza por uno que lea la cuenta, y los grupos no cambian.
- **Sin migración.** El documento de grupos (`dividy`, v4) no se toca: ningún usuario existente ve su documento reescrito, y una versión anterior de la app (por ejemplo un service worker en caché) sigue leyendo el documento sin romperse.

## Considered Options

- **Un campo `viewers` en el documento (v5, con migración desde v4 a un mapa vacío)**: coherente con `snapshots`, pero mezcla una preferencia con los datos, obliga a una migración y deja a la elección dentro del documento que más adelante vendrá de un servidor. Descartado: el único beneficio era compartir `LocalStorageStore`, que aquí no hace falta (no hay cuarentena ni migración que compartir).
- **Un campo `viewerId` dentro de `Group` y de `Snapshot`**: lo más directo, y lo peor: viaja con el link y se confunde con un dato del grupo. Descartado.
- **Una sola clave `groupId → memberId`**: el problema de colisión entre grupo propio y captura descrito arriba.

## Consequences

- Un valor ilegible (JSON roto, versión desconocida, entrada de otra forma) se trata como "nadie preguntó"; las entradas buenas se conservan y la siguiente elección reescribe la clave. No hay cuarentena: perder esta preferencia cuesta un toque, no datos.
- Los miembros de una captura se identifican por posición (ADR 0006). Si un link más nuevo del mismo grupo quita a alguien que iba antes en la lista, la posición guardada puede apuntar a otra persona. Se corrige con "Cambiar"; con ids estables del backend deja de ocurrir.
- Cerrar la hoja "¿Quién eres?" sin elegir (X, Escape, deslizar) no guarda nada y vuelve a preguntar la próxima vez que se abra el grupo o la captura; solo "No soy parte de este grupo" / "Solo estoy mirando" guardan `none`. Así un gesto accidental no apaga la personalización sin que la persona lo sepa.
- Una implementación HTTP de `ViewerRepository` tiene que pasar la misma suite de contrato (`viewer-repository.contract.ts`).
