import { createContext, useEffect, useState } from 'react';

// Breakpoints to listen
const mediaQueries: BreakpointsMediaQueries = {
  sm: window.matchMedia('(min-width: 640px)'),
  md: window.matchMedia('(min-width: 768px)'),
  lg: window.matchMedia('(min-width: 1024px)'),
  xl: window.matchMedia('(min-width: 1280px)'),
  xxl: window.matchMedia('(min-width: 1536px)'),
};

const evaluateQuery = (mediaQueries: BreakpointsMediaQueries): Breakpoints => ({
  sm: mediaQueries.sm.matches,
  md: mediaQueries.md.matches,
  lg: mediaQueries.lg.matches,
  xl: mediaQueries.xl.matches,
  xxl: mediaQueries.xxl.matches,
});

export const BreakpointContext = createContext(evaluateQuery(mediaQueries));

interface Props {
  children: JSX.Element;
}
function BreakpointProvider({ children }: Props) {
  const [breakpoints, setBreakpoints] = useState(evaluateQuery(mediaQueries));

  useEffect(() => {
    const handleResize = () => setBreakpoints(evaluateQuery(mediaQueries));

    // Update breakpoints when any of them matches
    Object.values(mediaQueries).forEach((query: MediaQueryList) => {
      query.addEventListener('change', handleResize);
    });

    return () => {
      Object.values(mediaQueries).forEach((query: MediaQueryList) => {
        query.removeEventListener('change', handleResize);
      });
    };
  }, []);

  return (
    <BreakpointContext.Provider value={breakpoints}>
      {children}
    </BreakpointContext.Provider>
  );
}

export default BreakpointProvider;
