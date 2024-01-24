import { useBreakpointStore } from 'src/store/useBreakpointStore';

export function useBreakpoint(): Breakpoints {
  const { breakpoints } = useBreakpointStore();
  return breakpoints;
}

export default useBreakpoint;
