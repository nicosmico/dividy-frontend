import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  formatAmount,
  getPendingAmount,
  getTotalSpent,
  type Group,
} from '@/domain';
import { MemberAvatar } from '@/features/members';
import { formatDate } from '@/lib/dates';

const MAX_AVATARS = 5;

export function GroupCard({ group }: { group: Group }) {
  const shown = group.members.slice(0, MAX_AVATARS);
  const hidden = group.members.length - shown.length;
  const count = group.members.length;
  const pending = getPendingAmount(group);

  return (
    <Link
      to={`/groups/${group.id}`}
      className='block rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40'
    >
      <Card className='gap-3 transition-colors hover:bg-card/70'>
        <div className='flex items-start justify-between gap-3'>
          <h2 className='min-w-0 text-lg font-semibold break-words'>
            {group.name}
          </h2>
          <p className='shrink-0 text-lg font-semibold tabular-nums'>
            {formatAmount(getTotalSpent(group))}
          </p>
        </div>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center'>
            {shown.map((member) => (
              <MemberAvatar
                key={member.id}
                member={member}
                className='-ml-2 size-8 ring-2 ring-card first:ml-0'
              />
            ))}
            {hidden > 0 && (
              <span className='-ml-2 flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground ring-2 ring-card'>
                +{hidden}
              </span>
            )}
          </div>
          <p className='text-right text-sm text-muted-foreground'>
            {count} {count === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5'>
          {pending === 0 ? (
            <Badge variant='accent'>Al día</Badge>
          ) : (
            <Badge
              variant='outline'
              className='border-destructive/40 text-destructive'
            >
              Pendiente: {formatAmount(pending)} por saldar
            </Badge>
          )}
          <p className='text-xs whitespace-nowrap text-muted-foreground'>
            Actualizado el {formatDate(group.updatedAt)}
          </p>
        </div>
      </Card>
    </Link>
  );
}
