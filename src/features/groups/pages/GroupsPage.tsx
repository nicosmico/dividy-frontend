import { Plus } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SharedWithMeSection, useSnapshots } from '@/features/share';
import { GroupCard } from '../components/GroupCard';
import { Welcome } from '../components/Welcome';
import { useGroups } from '../data';

/** `/`: my groups, or a short welcome when there are none. */
export function GroupsPage() {
  const { data: groups } = useGroups();
  const snapshotsQuery = useSnapshots();
  // A broken snapshots list must never hide your own groups.
  const snapshots =
    snapshotsQuery.data ?? (snapshotsQuery.isPending ? undefined : []);

  if (!groups || !snapshots) {
    return (
      <div className='grid gap-3' aria-busy='true'>
        <Skeleton className='h-8 w-1/2' />
        <Skeleton className='h-28' />
        <Skeleton className='h-28' />
      </div>
    );
  }

  if (groups.length === 0 && snapshots.length === 0) return <Welcome />;

  return (
    <div className='grid gap-4'>
      <div className='flex items-center justify-between gap-2'>
        <h1 className='text-2xl font-bold tracking-tight'>Mis grupos</h1>
        <Button asChild size='sm'>
          <Link to='/groups/new'>
            <Plus /> Crear grupo
          </Link>
        </Button>
      </div>
      {groups.length === 0 ? (
        <p className='text-muted-foreground'>
          Aún no tienes grupos propios. Crea uno para empezar.
        </p>
      ) : (
        <ul className='grid gap-3'>
          {groups.map((group) => (
            <li key={group.id}>
              <GroupCard group={group} />
            </li>
          ))}
        </ul>
      )}
      <SharedWithMeSection snapshots={snapshots} />
    </div>
  );
}
