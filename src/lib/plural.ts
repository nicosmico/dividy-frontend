/** `plural(1, 'gasto', 'gastos')` → `1 gasto`; `plural(3, ...)` → `3 gastos`. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
