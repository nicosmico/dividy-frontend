import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { Suspense, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router';

import { PageFallback } from '@/components/page-fallback';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DeleteGroupDialog } from '../components/DeleteGroupDialog';
import { GroupNotFound } from '../components/GroupNotFound';
import { RenameGroupDialog } from '../components/RenameGroupDialog';
import { useGroup } from '../data';

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
    <div className='grid grid-cols-[minmax(0,1fr)] gap-4'>
      <div className='flex items-center justify-between gap-2'>
        <h1 className='min-w-0 text-2xl font-bold tracking-tight break-words'>
          {group.name}
        </h1>
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
              <Pencil /> Renombrar grupo
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

      <nav
        aria-label='Secciones del grupo'
        className='grid h-[3.25rem] grid-cols-3 gap-1 rounded-full bg-secondary p-1'
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
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

      <Suspense fallback={<PageFallback />}>
        <Outlet context={group} />
      </Suspense>

      <RenameGroupDialog
        group={group}
        open={renaming}
        onOpenChange={setRenaming}
      />
      <DeleteGroupDialog
        group={group}
        open={deleting}
        onOpenChange={setDeleting}
      />
    </div>
  );
}
