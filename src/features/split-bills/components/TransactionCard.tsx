import { IconArrowNarrowRight } from '@tabler/icons-react';
import { useMemo } from 'react';
import { Card } from 'src/shared';
import { formatToCurrency } from 'src/shared/utils/format-to';
import { Member, MemberId } from '../types/member';
import { Transaction } from '../types/transaction';

interface Props {
  member: Member;
  transactions: Transaction[];
  members: Record<MemberId, Member>;
}
export function TransactionCard({ member, transactions, members }: Props) {
  const debts = useMemo(() => {
    return transactions.filter((t) => t.from === member.id);
  }, [member.id, transactions]);

  return (
    <Card className='space-y-4 p-4 shadow-sm'>
      {debts.map(({ to, amount }) => (
        <div key={to} className='min-w-0 flex-col items-center gap-2'>
          <div className='flex items-center justify-center gap-0.5'>
            <img
              className='max-w-[50px] rounded-full bg-rose-300 p-0.5 shadow-md'
              src={member.picture.sad}
              alt={member.name}
            />
            <IconArrowNarrowRight></IconArrowNarrowRight>
            <img
              className='max-w-[50px] rounded-full bg-blue-300 p-0.5 shadow-md'
              src={members[to].picture.happy}
              alt={members[to].name}
            />
          </div>
          <div className='text-center'>
            <span className='font-bold'>{member.name}</span> debe a{' '}
            <span className='font-bold'>{members[to].name}</span>:
            <span> {formatToCurrency(amount)}</span>
          </div>
        </div>
      ))}
    </Card>
  );
}
