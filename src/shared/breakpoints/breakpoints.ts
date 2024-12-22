type BreakpointsOptions = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

type Breakpoints = {
  [key in BreakpointsOptions]: boolean;
};

type BreakpointsMediaQueries = {
  [key in BreakpointsOptions]: MediaQueryList;
};
