import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import type { Snapshot } from '@/domain';
import { useDeleteSnapshot } from '../data/snapshot-queries';

/**
 * "Eliminar captura" in the view of a saved snapshot. There is no
 * confirmation: the toast offers "Deshacer" (as everywhere else in the app).
 */
export function DeleteSnapshotButton({ snapshot }: { snapshot: Snapshot }) {
  const { remove, isPending } = useDeleteSnapshot();
  const navigate = useNavigate();
  return (
    <Button
      variant='outline'
      disabled={isPending}
      onClick={() =>
        void remove(snapshot, () => navigate('/', { replace: true }))
      }
    >
      <Trash2 aria-hidden='true' /> Eliminar captura
    </Button>
  );
}
