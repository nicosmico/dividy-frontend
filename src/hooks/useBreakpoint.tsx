import { useEffect, useState } from 'react';

interface Breakpoints {
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  xxl: boolean;
}

interface BreakpointsMediaQueries {
  sm: MediaQueryList;
  md: MediaQueryList;
  lg: MediaQueryList;
  xl: MediaQueryList;
  xxl: MediaQueryList;
}

function evaluateQuery(mediaQueries: BreakpointsMediaQueries): Breakpoints {
  return {
    sm: mediaQueries.sm.matches,
    md: mediaQueries.md.matches,
    lg: mediaQueries.lg.matches,
    xl: mediaQueries.xl.matches,
    xxl: mediaQueries.xxl.matches,
  };
}

// Media queries to listen
const mediaQueries: BreakpointsMediaQueries = {
  sm: window.matchMedia('(min-width: 640px)'),
  md: window.matchMedia('(min-width: 768px)'),
  lg: window.matchMedia('(min-width: 1024px)'),
  xl: window.matchMedia('(min-width: 1280px)'),
  xxl: window.matchMedia('(min-width: 1536px)'),
};

export function useBreakpoint(): Breakpoints {
  const [breakpoints, setBreakpoints] = useState<Breakpoints>(
    evaluateQuery(mediaQueries)
  );

  useEffect(() => {
    const handleResize = () => setBreakpoints(evaluateQuery(mediaQueries));

    // Update breakpoints when any of them matches
    Object.values(mediaQueries).forEach((query: MediaQueryList) => {
      query.addEventListener('change', handleResize);
    });

    return () => {
      // Remove enventListener
      Object.values(mediaQueries).forEach((query: MediaQueryList) => {
        query.removeEventListener('change', handleResize);
      });
    };
  }, []);

  return breakpoints;
}

export default useBreakpoint;
