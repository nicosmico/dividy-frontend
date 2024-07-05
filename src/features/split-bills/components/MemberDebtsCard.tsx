import { Card } from 'src/components/ui';
import { formatToCurrency } from 'src/utils/format-to';
import { Member } from '../types/member';
import { MemberDebts } from '../types/totals';

interface Props {
  memberDebts: MemberDebts;
  members: { [uuid: string]: Member };
}
export function MemberDebtsCard({ memberDebts, members }: Props) {
  const member = members[memberDebts.member];

  return (
    <Card>
      <div className='flex min-w-0 items-center gap-4'>
        <img
          className='max-w-[50px] rounded-full border-2 border-zinc-800 p-0.5'
          src={member.picture}
          alt={member.name}
        />
        <span className='truncate font-medium'>{member.name}</span>
      </div>

      <ul className='space-y-4'>
        {memberDebts.debts.map((debt) => (
          <li key={debt.uuid}>
            <div>
              <p className='text-sm font-medium'>
                {members[debt.bill.paidBy].name}
              </p>
              <p className='text-lg font-bold'>
                {formatToCurrency(debt.total)}
              </p>
            </div>

            <p className='text-sm'>{debt.bill.name}</p>
            <ul className='text-sm'>
              {debt.items.map((item) => (
                <li key={item.uuid} className='ml-2 flex justify-between'>
                  <div>
                    {item.name}
                    <span className='ml-1 text-xs'>
                      ({formatToCurrency(item.price)} / {item.members.length})
                    </span>
                  </div>
                  <span>
                    {formatToCurrency(item.price / item.members.length)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  );
}
