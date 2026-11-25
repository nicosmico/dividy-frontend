import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Outlet, useParams } from 'react-router';

import { PageFallback } from '@/components/page-fallback';
import { TabNav } from '@/components/tab-nav';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EntityIcon } from '@/features/icons';
import { ViewerSheet } from '@/features/members';
import { DeleteGroupDialog } from '../components/DeleteGroupDialog';
import { GroupNotFound } from '../components/GroupNotFound';
import { EditGroupDialog } from '../components/EditGroupDialog';
import { useGroup, ViewerProvider } from '../data';

const TABS = [
  { to: 'expenses', label: 'Gastos' },
  { to: 'balances', label: 'Saldos' },
  { to: 'members', label: 'Miembros' },
];

/** `/groups/:groupId`: group title and menu, tab navigation and the active tab. */
export function GroupLayout() {
  const { groupId = '' } = useParams();
  const { data: group, isPending } = useGroup(groupId);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isPending) {
    return (
      <div className='grid grid-cols-[minmax(0,1fr)] gap-4' aria-busy='true'>
        <Skeleton className='h-10 w-2/3' />
        <Skeleton className='h-12' />
        <Skeleton className='h-32' />
      </div>
    );
  }
  if (!group) return <GroupNotFound />;

  return (
    <ViewerProvider
      key={group.id}
      scope={{ kind: 'group', id: group.id }}
      members={group.members}
    >
      <div className='grid grid-cols-[minmax(0,1fr)] gap-4'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex min-w-0 items-center gap-3'>
            <EntityIcon text={group.name} kind='group' size='header' />
            <h1 className='min-w-0 text-2xl font-bold tracking-tight break-words'>
              {group.name}
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                aria-label='Opciones del grupo'
                className='-mr-2 shrink-0'
              >
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil /> Editar grupo
              </DropdownMenuItem>
              <DropdownMenuItem
                variant='destructive'
                onSelect={() => setDeleting(true)}
              >
                <Trash2 /> Eliminar grupo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TabNav tabs={TABS} />

        <Suspense fallback={<PageFallback />}>
          <Outlet context={group} />
        </Suspense>

        <EditGroupDialog
          group={group}
          open={renaming}
          onOpenChange={setRenaming}
        />
        <DeleteGroupDialog
          group={group}
          open={deleting}
          onOpenChange={setDeleting}
        />
        <ViewerSheet />
      </div>
    </ViewerProvider>
  );
}
