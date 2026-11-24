import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { Skeleton } from '@/components/ui/skeleton';
import type { Result, Snapshot } from '@/domain';
import { InvalidLink } from '../components/SnapshotMessages';
import { SaveSnapshotControls } from '../components/SaveSnapshotControls';
import { SnapshotView } from '../components/SnapshotView';
import { decodeSnapshot } from '../snapshot-codec';

interface Decoded {
  hash: string;
  result: Result<Snapshot>;
}

/** Decodes the link in the URL hash. `null` while it is being opened. */
function useDecodedSnapshot(hash: string): Result<Snapshot> | null {
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  useEffect(() => {
    let cancelled = false;
    void decodeSnapshot(hash).then((result) => {
      if (!cancelled) setDecoded({ hash, result });
    });
    return () => {
      cancelled = true;
    };
  }, [hash]);
  return decoded?.hash === hash ? decoded.result : null;
}

/**
 * `/shared#v1.<payload>`: opens a snapshot straight from the link, even on a
 * first visit (the welcome screen is not involved). Its tabs are the children
 * of this route.
 */
export function LinkSnapshotPage() {
  const { hash } = useLocation();
  const result = useDecodedSnapshot(hash);

  if (!result) {
    return (
      <div className='grid gap-3' aria-busy='true'>
        <Skeleton className='h-16' />
        <Skeleton className='h-10 w-2/3' />
        <Skeleton className='h-32' />
      </div>
    );
  }
  if (!result.ok) return <InvalidLink />;
  return (
    <SnapshotView
      snapshot={result.value}
      actions={<SaveSnapshotControls snapshot={result.value} />}
    />
  );
}

/** `/shared#...` (no tab): goes to Gastos without losing the hash. */
export function RedirectToExpenses() {
  const { hash } = useLocation();
  return <Navigate to={{ pathname: 'expenses', hash }} replace />;
}
