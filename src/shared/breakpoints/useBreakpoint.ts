import { useBreakpointStore } from 'src/shared/breakpoints/useBreakpointStore';

export function useBreakpoint(): Breakpoints {
  const { breakpoints } = useBreakpointStore();
  return breakpoints;
}

export default useBreakpoint;
