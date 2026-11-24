import { useParams } from 'react-router';

import { Skeleton } from '@/components/ui/skeleton';
import { DeleteSnapshotButton } from '../components/DeleteSnapshotButton';
import { SnapshotNotFound } from '../components/SnapshotMessages';
import { SnapshotView } from '../components/SnapshotView';
import { useSnapshot } from '../data/snapshot-queries';

/**
 * `/shared/:snapshotId/...`: a snapshot saved on this device (the id is the
 * `sourceGroupId`), with the same view and banner as one opened from a link
 * and "Eliminar captura" instead of "Guardar".
 */
export function SavedSnapshotPage() {
  const { snapshotId = '' } = useParams();
  const { data: snapshot, isPending } = useSnapshot(snapshotId);

  if (isPending) {
    return (
      <div className='grid gap-3' aria-busy='true'>
        <Skeleton className='h-16' />
        <Skeleton className='h-10 w-2/3' />
        <Skeleton className='h-32' />
      </div>
    );
  }
  if (!snapshot) return <SnapshotNotFound />;
  return (
    <SnapshotView
      snapshot={snapshot}
      actions={<DeleteSnapshotButton snapshot={snapshot} />}
    />
  );
}
