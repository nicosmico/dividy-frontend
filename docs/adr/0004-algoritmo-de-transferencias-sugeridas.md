# Las transferencias sugeridas usan un algoritmo voraz, no el mínimo óptimo

Encontrar el número mínimo de transferencias que salda un grupo es un problema NP-difícil. Decidimos usar un algoritmo voraz sobre enteros: emparejar repetidamente al mayor deudor con el mayor acreedor, con desempate determinístico por orden de miembros. Garantiza que todos los saldos quedan exactamente en cero, que hay como máximo `n - 1` transferencias y que el resultado es estable entre ejecuciones; no garantiza el mínimo absoluto. Para grupos de amigos la diferencia es despreciable y la previsibilidad pesa más.
