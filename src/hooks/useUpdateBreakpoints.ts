import { useEffect } from 'react';
import { useBreakpointStore } from 'src/store/useBreakpointStore';

export function useUpdateBreakpoints() {
  const breakpoints = useBreakpointStore((state) => state.breakpoints);
  const updateBreakpoints = useBreakpointStore(
    (state) => state.updateBreakpoints
  );
  const mediaQueries = useBreakpointStore((state) => state.mediaQueries);

  useEffect(() => {
    // Update breakpoints when any of them matches
    const handleResize = () => updateBreakpoints();
    Object.values(mediaQueries).forEach((query: MediaQueryList) => {
      query.addEventListener('change', handleResize);
    });

    return () => {
      Object.values(mediaQueries).forEach((query: MediaQueryList) => {
        query.removeEventListener('change', handleResize);
      });
    };
  }, []);

  return breakpoints;
}

export default useUpdateBreakpoints;
