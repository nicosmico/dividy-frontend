import { useContext } from 'react';
import { BreakpointContext } from 'src/context/BreakpointProvider';

export function useBreakpoint(): Breakpoints {
  const breakpoints = useContext(BreakpointContext);

  if (!breakpoints) {
    throw new Error('useBreakpoints must be used within a BreakpointsProvider');
  }
  return breakpoints;
}

export default useBreakpoint;
