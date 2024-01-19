import { useEffect, useState } from 'react';
import { debounce } from 'src/utils/debounce';

interface Breakpoints {
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  xxl: boolean;
}

function getInitialBreakpoints(): Breakpoints {
  return {
    sm: window.innerWidth >= 640,
    md: window.innerWidth >= 768,
    lg: window.innerWidth >= 1024,
    xl: window.innerWidth >= 1280,
    xxl: window.innerWidth >= 1536,
  };
}

export function useBreakpoint(): Breakpoints {
  const [currentBreakpoints, setCurrentBreakpoints] = useState<Breakpoints>(
    getInitialBreakpoints()
  );

  useEffect(() => {
    const handleResize = () => setCurrentBreakpoints(getInitialBreakpoints());
    const debouncedHandleResize = debounce(handleResize, 100);
    window.addEventListener('resize', debouncedHandleResize);

    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
    };
  }, []);

  return currentBreakpoints;
}

export default useBreakpoint;
