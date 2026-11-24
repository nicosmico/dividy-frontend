import { Suspense, useMemo, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router';

import { PageFallback } from '@/components/page-fallback';
import { TabNav } from '@/components/tab-nav';
import { snapshotToGroup, type Snapshot } from '@/domain';
import { EntityIcon } from '@/features/icons';
import { SnapshotViewProvider } from '@/hooks/snapshot-view-provider';
import { SnapshotBanner } from './SnapshotBanner';

/**
 * Read-only view of a snapshot: the banner, the title, the actions of this
 * kind of view ("Guardar en mi celular" or "Eliminar captura"), the tabs
 * Gastos and Saldos (no Miembros) and the active tab. The tabs are the same
 * components as a group's: they read `useSnapshotView()` and hide what edits.
 *
 * The tab links keep the hash of the URL, because a snapshot opened from a
 * link carries its data there.
 */
export function SnapshotView({
  snapshot,
  actions,
}: {
  snapshot: Snapshot;
  actions: ReactNode;
}) {
  const group = useMemo(() => snapshotToGroup(snapshot), [snapshot]);
  const { hash } = useLocation();

  return (
    <SnapshotViewProvider snapshot={snapshot}>
      {/* Not a grid: `position: sticky` only works inside its own grid area. */}
      <div className='flex flex-col gap-4'>
        <SnapshotBanner takenAt={snapshot.takenAt} />
        <div className='flex min-w-0 items-center gap-3'>
          <EntityIcon text={snapshot.name} kind='group' size='header' />
          <h1 className='min-w-0 text-2xl font-bold tracking-tight break-words'>
            {snapshot.name}
          </h1>
        </div>
        {actions}
        <TabNav
          tabs={[
            { to: { pathname: 'expenses', hash }, label: 'Gastos' },
            { to: { pathname: 'balances', hash }, label: 'Saldos' },
          ]}
        />
        <Suspense fallback={<PageFallback />}>
          <Outlet context={group} />
        </Suspense>
      </div>
    </SnapshotViewProvider>
  );
}
