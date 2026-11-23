export type BreakpointsOptions = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export type Breakpoints = {
  [key in BreakpointsOptions]: boolean;
};

export type BreakpointsMediaQueries = {
  [key in BreakpointsOptions]: MediaQueryList;
};
