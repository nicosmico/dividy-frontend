# La persistencia vive detrás de un repositorio asíncrono y la UI la consume con TanStack Query

Hoy los datos se guardan solo en el navegador, pero queremos poder pasar a un backend compartido sin reescribir la app. Decidimos que la UI nunca toca `localStorage` directamente: habla con un puerto `GroupRepository` **asíncrono** (devuelve `Promise`), cuya única implementación actual es `LocalStorageGroupRepository`. La UI lee y escribe a través de TanStack Query (queries y mutations), que es exactamente como se consumiría una API HTTP.

## Considered Options

- **Zustand con `persist`** (lo que había): simple, pero acopla la UI a un almacenamiento síncrono y local; migrar a backend obligaba a reescribir cada componente.
- **Repositorio + TanStack Query** (elegido): un poco más de ceremonia hoy, pero cambiar a HTTP es implementar otra clase del mismo puerto y correr los mismos tests de contrato.

## Consequences

- Las reglas de negocio viven en el dominio puro (sin React ni almacenamiento); el repositorio solo guarda y recupera grupos.
- Los IDs se generan en el cliente (UUID/nanoid) para que funcionen offline y sigan siendo válidos si luego existe un servidor.
- El documento guardado tiene versión (`{ version, groups }`) y migraciones explícitas.
