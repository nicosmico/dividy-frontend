import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DEFAULT_CURRENCY,
  formatAmount,
  getPendingAmount,
  getTotalSpent,
  type Group,
} from '@/domain';
import { EntityIcon } from '@/features/icons';
import { MemberAvatar, useMemberMoods } from '@/features/members';
import { formatDate } from '@/lib/dates';

const MAX_AVATARS = 5;

export function GroupCard({ group }: { group: Group }) {
  const shown = group.members.slice(0, MAX_AVATARS);
  const hidden = group.members.length - shown.length;
  const count = group.members.length;
  const pending = getPendingAmount(group);
  const moods = useMemberMoods(group);

  return (
    <Link
      to={`/groups/${group.id}`}
      className='block rounded-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40'
    >
      <Card className='gap-3 rounded-card p-[1.125rem] transition-colors hover:bg-card/70'>
        <div className='flex items-center gap-3.5'>
          <EntityIcon text={group.name} kind='group' size='card' />
          <div className='flex min-w-0 flex-1 items-start justify-between gap-3'>
            <h2 className='min-w-0 text-lg font-semibold break-words'>
              {group.name}
            </h2>
            <p className='shrink-0 text-lg font-semibold tabular-nums'>
              {formatAmount(getTotalSpent(group), group.currency)}
              {group.currency !== DEFAULT_CURRENCY && (
                <span className='ml-1.5 text-xs font-medium text-muted-foreground'>
                  {group.currency}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center'>
            {shown.map((member) => (
              <MemberAvatar
                key={member.id}
                member={member}
                mood={moods.get(member.id)}
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
            <Badge variant='negative'>
              Pendiente: {formatAmount(pending, group.currency)} por saldar
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
