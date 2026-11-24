import { Eye, Trash2 } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Snapshot } from '@/domain';
import { EntityIcon } from '@/features/icons';
import { formatDate } from '@/lib/dates';
import { useDeleteSnapshot } from '../data/snapshot-queries';

/**
 * "Compartidos conmigo · solo lectura" in Mis grupos: the saved snapshots,
 * below your own groups and never mixed with them. Renders nothing when there
 * are none.
 */
export function SharedWithMeSection({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length === 0) return null;
  return (
    <section aria-labelledby='shared-with-me-heading' className='grid gap-3'>
      <h2
        id='shared-with-me-heading'
        className='text-sm font-semibold text-muted-foreground'
      >
        Compartidos conmigo · solo lectura
      </h2>
      <ul className='grid gap-3'>
        {snapshots.map((snapshot) => (
          <li key={snapshot.sourceGroupId}>
            <SnapshotCard snapshot={snapshot} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SnapshotCard({ snapshot }: { snapshot: Snapshot }) {
  const { remove, isPending } = useDeleteSnapshot();
  return (
    <Card className='flex-row items-center gap-1 rounded-card p-2 pl-0'>
      <Link
        to={`/shared/${snapshot.sourceGroupId}/expenses`}
        className='flex min-w-0 flex-1 items-center gap-3.5 rounded-card p-2.5 pl-[1.125rem] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40'
      >
        <EntityIcon text={snapshot.name} kind='group' size='card' />
        <span className='grid min-w-0 gap-0.5'>
          <span className='text-lg font-semibold break-words'>
            {snapshot.name}
          </span>
          <span className='flex items-center gap-1.5 text-sm text-muted-foreground'>
            <Eye aria-hidden='true' className='size-4 shrink-0' />
            Captura del {formatDate(snapshot.takenAt)}
          </span>
        </span>
      </Link>
      <Button
        variant='ghost'
        size='icon'
        aria-label={`Eliminar captura de ${snapshot.name}`}
        disabled={isPending}
        onClick={() => void remove(snapshot)}
      >
        <Trash2 aria-hidden='true' />
      </Button>
    </Card>
  );
}
