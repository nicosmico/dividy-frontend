import { create } from 'zustand';

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

interface BreakpointStore {
  breakpoints: Breakpoints;
  updateBreakpoints: () => void;
  mediaQueries: BreakpointsMediaQueries;
}
export const useBreakpointStore = create<BreakpointStore>((set) => ({
  breakpoints: evaluateQuery(mediaQueries),
  updateBreakpoints: () => set({ breakpoints: evaluateQuery(mediaQueries) }),
  mediaQueries,
}));
