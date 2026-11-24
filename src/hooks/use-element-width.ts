import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Width in px of an element, kept up to date with a ResizeObserver. It is `0`
 * when it cannot be known (before the first measure, no layout engine as in
 * jsdom, or the element is hidden): callers treat that as "unknown".
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
