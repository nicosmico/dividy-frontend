import type { Breakpoints } from '@/shared/breakpoints/breakpoints';
import { useBreakpointStore } from '@/shared/breakpoints/useBreakpointStore';

export function useBreakpoint(): Breakpoints {
  const { breakpoints } = useBreakpointStore();
  return breakpoints;
}

export default useBreakpoint;
