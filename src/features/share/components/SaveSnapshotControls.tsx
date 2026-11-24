import { Check, Download, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { decideSnapshotSave, type Snapshot } from '@/domain';
import { formatDateTime } from '@/lib/dates';
import { restoreFocusIfLost } from '@/lib/focus';
import { useSaveSnapshot, useSnapshot } from '../data/snapshot-queries';

/**
 * "Guardar en mi celular" for a snapshot opened from a link. What it offers
 * depends on what is already saved for the same group (`decideSnapshotSave`):
 * save it, update an older capture, "Ya está guardada" for the same one, or a
 * warning with a way to the newer capture that is already saved.
 */
export function SaveSnapshotControls({ snapshot }: { snapshot: Snapshot }) {
  const saved = useSnapshot(snapshot.sourceGroupId);
  const { save, isPending } = useSaveSnapshot();

  if (saved.isPending) {
    return (
      <Button disabled>
        <Download aria-hidden='true' /> Guardar en mi celular
      </Button>
    );
  }
  const existing = saved.data ?? null;
  const decision = decideSnapshotSave(existing, snapshot);

  if (decision === 'older' && existing) {
    return (
      <div
        role='status'
        className='grid gap-2 rounded-card border bg-card p-3 text-sm'
      >
        <p>
          Ya tienes guardada una captura más nueva (del{' '}
          <time dateTime={existing.takenAt}>
            {formatDateTime(existing.takenAt)}
          </time>
          ).
        </p>
        <Button asChild variant='outline'>
          <Link to={`/shared/${existing.sourceGroupId}/expenses`}>
            Ver la más nueva
          </Link>
        </Button>
      </div>
    );
  }

  if (decision === 'same') {
    return (
      <Button disabled>
        <Check aria-hidden='true' /> Ya está guardada
      </Button>
    );
  }

  async function saveNow() {
    const outcome = await save(snapshot);
    if (outcome.status === 'save')
      toast.success('Captura guardada en Mis grupos');
    else if (outcome.status === 'replace') toast.success('Captura actualizada');
    // The button that had focus changed into another one.
    if (outcome.status !== 'failed') restoreFocusIfLost();
  }

  const replacing = decision === 'replace';
  const Icon = replacing ? RefreshCw : Download;
  return (
    <Button disabled={isPending} onClick={() => void saveNow()}>
      <Icon aria-hidden='true' />
      {replacing ? 'Actualizar captura guardada' : 'Guardar en mi celular'}
    </Button>
  );
}
