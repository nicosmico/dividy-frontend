# Compartir un grupo es un link de solo lectura con la captura comprimida en el hash

Dividy no tiene backend (Fase 5), pero ya se puede compartir lo que importa: lo que cada persona debe y por qué. Decidimos que "Compartir resumen" agrega un link que abre una **Snapshot** (Captura): una copia fija del grupo en un momento, que se ve sin cuenta ni servidor y no se puede editar. La captura viaja **entera dentro del link**, en el hash (`#`) de la URL.

## Formato

```
https://<dominio>/shared#v2.<payload>
```

- **En el hash, nunca en la query ni en la ruta.** El navegador no envía el hash al servidor, así que los nombres, gastos y montos del grupo no pasan por Netlify ni quedan en sus registros, ni en el `Referer` de un enlace externo. La ruta `/shared` y el id de una captura guardada (`/shared/:snapshotId`) no contienen datos.
- **Versionado.** `v1.`, `v2.`... es la versión del formato. Cada versión tiene su decodificador (`DECODERS` en `snapshot-codec.ts`), así que un link compartido hoy sigue abriéndose cuando el formato cambie; una versión que no conocemos da un error propio y amable.
- **Contenido** (y nada más): id del grupo original (`sourceGroupId`), fecha y hora de la captura (`takenAt`, ISO), nombre del grupo, miembros (nombre y avatar `{ color, seed }`, en orden), gastos (descripción, monto, quién pagó, participantes, fecha y `createdAt`) y pagos (de quién a quién, monto, fecha y `createdAt`). El ícono del grupo y el de cada gasto no viajan: salen del texto (decisión 89). `createdAt` viaja porque el orden de la lista de gastos y de pagos lo usa para desempatar. No viajan ids de miembros, gastos ni pagos, ni `createdAt` / `updatedAt` del grupo.
- **Payload v1 (y v2, ver abajo):** captura validada → forma compacta (`toCompactSnapshotV1`: listas posicionales sin claves, ids reemplazados por la posición del miembro y fechas como milisegundos) → JSON → UTF-8 → `CompressionStream('deflate-raw')` → base64url (solo `A-Z a-z 0-9 - _`, seguro en una URL y al pegarlo en un chat).
- **Validación.** Decodificar nunca lanza: devuelve un `Result` con un mensaje en español. Se valida la forma con Zod y después con las mismas reglas de un grupo (`getGroupIssues`), así que un link manipulado no puede producir un grupo inválido. La descompresión se corta en 1 MB para que un link diminuto no pueda inflarse a gigabytes.
- **Dónde vive.** El esquema, el mapeo posición ↔ id y la comparación de capturas son puros y están en `src/domain/snapshot.ts`. `CompressionStream` es una API web, así que el codec (`src/features/share/snapshot-codec.ts`) queda fuera del dominio.
- **Reproducible.** `createSnapshot` normaliza (ids por posición, participantes ordenados, fechas canónicas): `decode(encode(captura))` es exactamente la misma captura y calcula los mismos saldos que el grupo original.

## Tamaño medido

Un grupo de 8 miembros (con la semilla de avatar de 21 caracteres que genera la app), 60 gastos con descripciones variadas y 6 pagos: **1.897 caracteres** de token y **1.931** con la URL de Netlify (el test está en `snapshot-codec.test.ts` y falla si pasa de 4.000). Lo que más pesa es lo que no se comprime: las semillas de los avatares y los `createdAt`.

## v2: divisiones personalizadas

Cuando los gastos pudieron dividirse por montos, porcentajes o partes (ADR 0008), el link `v1` ya no alcanzaba: solo sabía de partes iguales. `v2` es el mismo payload con dos campos más al final de **cada gasto con división personalizada** (los gastos iguales siguen escribiéndose igual que en v1, sin bytes extra):

```
[descripción, monto, pagador, participantes, fecha, createdAt, tipo, valores]
```

- `tipo`: `1` montos (`exact`), `2` porcentaje (`percent`, en puntos básicos) o `3` partes (`shares`).
- `valores`: un entero por participante, en el mismo orden que `participantes` (que van ordenados por posición de miembro).
- **Quien genera usa siempre `v2.`** (`LINK_VERSION = 2`); `DECODERS` conserva el de `v1.`, así que los links ya compartidos siguen abriendo, y como es la misma forma sin los campos finales, ambos pasan por `fromCompactSnapshotV2`. Un `v2.` abierto en una app que solo entiende `v1.` cae en la pantalla "Este link no se pudo abrir" (versión desconocida): no hay nada que hacer para eso.
- La captura decodificada se valida con las mismas reglas de un grupo, que ahora incluyen que las divisiones sumen (`validateSplit`): un link manipulado con montos que no suman, partes en 0 o un tipo desconocido da el error amable.
- **Tamaño medido** con el mismo grupo de 60 gastos (8 miembros, 6 pagos) donde ahora 15 gastos (uno de cada cuatro, rotando entre montos, porcentaje y partes) tienen división personalizada: **2.161** caracteres de token y **2.195** con la URL de Netlify. El grupo con todos los gastos iguales sigue en 1.897. El test sigue fallando por encima de 4.000 caracteres.

## Qué pasa al abrir y al guardar

- Abrir un link muestra la captura directo, aun en la primera visita, con un aviso fijo ("Captura del …"). Es la misma pantalla de Gastos y Saldos, en modo solo lectura (un contexto, no una copia de los componentes).
- Una captura se puede **guardar** en el dispositivo, en una lista aparte de los grupos propios (documento v4 con `snapshots`, puerto `SnapshotRepository`, ADR 0002). La clave es `sourceGroupId`: un link más nuevo del mismo grupo reemplaza a la guardada, uno más viejo avisa y no la pisa, y el mismo no hace nada. "Más nuevo" se decide por `takenAt` (`decideSnapshotSave`).

## Considered Options

- **Query params (`/shared?d=...`)**: el servidor y sus registros verían los datos del grupo. Descartado por privacidad.
- **JSON sin comprimir**: el mismo grupo de la medición ocupa 13.500 caracteres como objetos con claves, y todavía 4.400 (unos 5.800 en base64) con la forma compacta sin comprimir; con deflate baja a 1.900. La compresión es nativa del navegador, sin dependencias.
- **Una librería de compresión (pako, lz-string)**: suma peso al bundle para algo que `CompressionStream` ya hace. Se compensa con un límite: Safari anterior a 16.4 no tiene `CompressionStream`; ahí "Compartir resumen" sigue funcionando, solo que sin el link, y un link no se puede abrir.
- **Backend y links cortos (`/s/abc123`)**: resuelve el largo y permite actualizar la misma captura, pero requiere servidor, cuentas o abuso controlado y guardar datos de terceros. Queda para la Fase 5, que lo hará de todos modos para los grupos compartidos.
- **Guardar las capturas como grupos con una marca `readOnly`**: mezclaría grupos propios con ajenos en cada lista, en cada operación de dominio y en cada migración. Se guardan aparte.

## Consequences

- **El link es una copia, no una conexión.** Quien lo recibe no ve cambios posteriores; para ver una versión más nueva le tienen que compartir otro link. El aviso lo dice.
- **Quien tiene el link ve todo lo que contiene**, y se puede reenviar. Por eso "Compartir resumen" lleva un aviso de privacidad. No se puede revocar un link ya compartido (hasta que haya backend).
- La fecha de la captura (`takenAt`) es el momento en que se preparó el link (cuando se abrió Saldos o cambió el grupo), no el del toque en "Compartir resumen": el link se arma antes porque `navigator.share` en iOS exige que se llame casi dentro del gesto del usuario y comprimir es asíncrono.
- Cambiar el formato es agregar `v2` y su decodificador, sin tocar los links viejos. Quien genera siempre usa la última versión (ver "v2" abajo: así fue).
- Los links largos funcionan en WhatsApp, Telegram y correo; algunas apps recortan los que pasan de unos pocos miles de caracteres. Un grupo muy grande podría no entrar; el límite práctico de unos 100 gastos queda por medir en uso real.
