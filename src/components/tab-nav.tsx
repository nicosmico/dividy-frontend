import { NavLink, type To } from 'react-router';

import { cn } from '@/lib/utils';

export interface TabNavItem {
  /** Route relative to the layout, e.g. `expenses` (or an object that keeps the hash). */
  to: To;
  label: string;
}

/**
 * Pill-shaped tab bar of a group (Gastos, Saldos, Miembros) or of a snapshot
 * (Gastos, Saldos). Same look in both; the labelled `nav` is what the E2E
 * helpers look for.
 */
export function TabNav({ tabs }: { tabs: TabNavItem[] }) {
  return (
    <nav
      aria-label='Secciones del grupo'
      className={cn(
        'grid h-[3.25rem] gap-1 rounded-full bg-secondary p-1',
        tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
      )}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.label}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-center rounded-full text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              isActive
                ? 'bg-tab-active font-semibold text-tab-active-foreground shadow-soft'
                : 'font-medium text-muted-foreground hover:text-foreground'
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
