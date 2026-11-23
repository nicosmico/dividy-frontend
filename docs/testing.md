# Estrategia de tests

En una app de plata, los tests son la evidencia de que los números son correctos. La mayor parte del esfuerzo va donde vive el dinero: el dominio.

| Capa         | Herramienta                      | Qué se prueba                                                                                                       | Dónde                              |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Dominio      | Vitest                           | Casos concretos en tablas: divisiones, restos, saldos, transferencias, operaciones del grupo, errores de validación | `src/domain/**/*.test.ts`          |
| Dominio      | Vitest + fast-check              | Propiedades que deben cumplirse para **cualquier** grupo generado al azar (ver abajo)                               | `src/domain/**/*.property.test.ts` |
| Persistencia | Vitest                           | Suite de contrato del `GroupRepository`, ejecutada contra cada implementación; migraciones del formato guardado     | `src/data/**/*.test.ts`            |
| Componentes  | Vitest + Testing Library (jsdom) | Formularios y componentes con lógica: validaciones visibles, lo que se envía al guardar, estados vacíos             | junto al componente                |
| End-to-end   | Playwright (desktop y móvil)     | Flujos completos en un navegador real y regresiones de bugs conocidos                                               | `e2e/`                             |

## Propiedades del dominio

Para cualquier grupo válido generado al azar:

1. La suma de las partes de un gasto es exactamente su monto, y cada parte difiere de las demás en a lo más $1.
2. La suma de los saldos del grupo es 0.
3. Aplicar las transferencias sugeridas deja todos los saldos exactamente en 0.
4. Hay como máximo `n - 1` transferencias sugeridas para `n` miembros con saldo distinto de cero, y ninguna tiene monto ≤ 0 ni va de un miembro a sí mismo.
5. Todos los montos calculados son enteros.
6. Los cálculos son determinísticos: la misma entrada da la misma salida.
7. Reasignar o eliminar en cascada un miembro deja un grupo válido (sin referencias a ese miembro y sin gastos sin participantes).

## Tests de componentes

`renderWithProviders(ui?, { route, groups, repository, now, newId })` (`src/test/render-with-providers.tsx`) renderiza con QueryClient, `InMemoryGroupRepository`, reloj e ids fijos (`TEST_NOW`, `id1`, `id2`...), toaster y `MemoryRouter`; sin `ui` renderiza `<AppRoutes />` completo en `route`. Devuelve `user` (user-event) y el `repository`, para verificar lo guardado, y `currentPath()` para verificar la navegación. `renderHookWithProviders` hace lo mismo para hooks. Las pantallas se cargan con `React.lazy`, así que tras navegar hay que esperar con `waitFor` o `findBy*`. Vitest corre con `pool: 'vmThreads'` (un jsdom por worker, sin perder aislamiento entre archivos).

## Convenciones

- Los tests describen comportamiento en español del dominio (`it('reparte el resto de a un peso a los primeros participantes')`).
- Nada de `Date.now()` ni IDs aleatorios en el dominio: se inyectan, así los tests son determinísticos.
- Cada bug encontrado se cubre primero con un test que falla y después se corrige.
- Los E2E son pocos y cubren flujos, no reglas: las reglas se prueban en el dominio, que es más rápido y preciso.

## Comandos

```bash
npm test               # unitarios + componentes
npm run test:coverage  # con cobertura (meta: ≥ 95 % en src/domain)
npm run test:e2e       # Playwright
```
