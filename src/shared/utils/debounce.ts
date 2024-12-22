export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  } as T;
}
