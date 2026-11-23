import { ChevronDown } from 'lucide-react';
import { Collapsible } from 'radix-ui';

import { Card } from '@/components/ui/card';
import {
  formatAmount,
  getMemberBreakdown,
  type Group,
  type Member,
  type MemberBreakdown,
} from '@/domain';
import { MemberAvatar } from '@/features/members';
import { describeBalance } from '@/lib/balance-text';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

/** Balance as text and color (never color alone). */
export function BalanceLabel({
  balance,
  className,
}: {
  balance: number;
  className?: string;
}) {
  const tone =
    balance > 0
      ? 'font-semibold text-positive'
      : balance < 0
        ? 'font-semibold text-negative'
        : 'font-medium text-muted-foreground';
  return (
    <span className={cn(tone, className)}>{describeBalance(balance)}</span>
  );
}

/** Balance of every member; each row expands to show where the number comes from. */
export function MemberBalances({ group }: { group: Group }) {
  return (
    <section aria-labelledby='member-balances-heading' className='grid gap-2'>
      <h2 id='member-balances-heading' className='text-sm font-semibold'>
        Saldo por miembro
      </h2>
      <ul className='grid gap-2'>
        {group.members.map((member) => {
          const breakdown = getMemberBreakdown(group, member.id);
          return (
            <li key={member.id}>
              {breakdown && (
                <MemberRow
                  group={group}
                  member={member}
                  breakdown={breakdown}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MemberRow({
  group,
  member,
  breakdown,
}: {
  group: Group;
  member: Member;
  breakdown: MemberBreakdown;
}) {
  const { balance } = breakdown;
  const nameOf = (id: string) =>
    group.members.find((m) => m.id === id)?.name ?? 'alguien';

  return (
    <Card className='gap-0 p-0'>
      <Collapsible.Root>
        <Collapsible.Trigger className='group flex w-full items-center gap-3 rounded-tile p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40'>
          <MemberAvatar
            member={member}
            decorative
            mood={balance.balance < 0 ? 'sad' : 'happy'}
          />
          <span className='min-w-0 flex-1'>
            <span className='block font-medium break-words'>{member.name}</span>
            <BalanceLabel balance={balance.balance} className='text-sm' />
          </span>
          <ChevronDown className='size-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180' />
        </Collapsible.Trigger>
        <Collapsible.Content className='grid gap-4 border-t px-3 pt-3 pb-4 text-sm'>
          <dl className='grid gap-1.5'>
            <Line label='Pagó en gastos' value={formatAmount(balance.paid)} />
            <Line label='Le corresponde' value={formatAmount(balance.share)} />
            {balance.paymentsSent > 0 && (
              <Line
                label='Pagos que envió'
                value={`+${formatAmount(balance.paymentsSent)}`}
              />
            )}
            {balance.paymentsReceived > 0 && (
              <Line
                label='Pagos que recibió'
                value={`−${formatAmount(balance.paymentsReceived)}`}
              />
            )}
            <div className='flex items-baseline justify-between gap-3 border-t pt-1.5 font-semibold'>
              <dt>Saldo</dt>
              <dd className='tabular-nums'>
                {balance.balance < 0 ? '−' : ''}
                {formatAmount(Math.abs(balance.balance))}
              </dd>
            </div>
          </dl>
          <p className='text-muted-foreground'>
            Saldo = pagó − le corresponde + pagos enviados − pagos recibidos.
          </p>

          {breakdown.expenses.length > 0 && (
            <div className='grid gap-1.5'>
              <h3 className='font-semibold'>Gastos en que aparece</h3>
              <ul className='grid gap-1.5'>
                {breakdown.expenses.map((line) => (
                  <li
                    key={line.expenseId}
                    className='flex items-baseline justify-between gap-3'
                  >
                    <span className='min-w-0 break-words'>
                      {line.description}
                      <span className='block text-xs text-muted-foreground'>
                        {formatDate(line.date)}
                      </span>
                    </span>
                    <span className='shrink-0 text-right tabular-nums'>
                      {line.paid > 0 && (
                        <span className='block'>
                          Pagó {formatAmount(line.paid)}
                        </span>
                      )}
                      <span className='block text-muted-foreground'>
                        Le tocó {formatAmount(line.share)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(breakdown.paymentsSent.length > 0 ||
            breakdown.paymentsReceived.length > 0) && (
            <div className='grid gap-1.5'>
              <h3 className='font-semibold'>Pagos</h3>
              <ul className='grid gap-1.5'>
                {breakdown.paymentsSent.map((p) => (
                  <li key={p.id} className='flex justify-between gap-3'>
                    <span className='min-w-0 break-words'>
                      Le pagó a {nameOf(p.toId)} · {formatDate(p.date)}
                    </span>
                    <span className='shrink-0 tabular-nums'>
                      +{formatAmount(p.amount)}
                    </span>
                  </li>
                ))}
                {breakdown.paymentsReceived.map((p) => (
                  <li key={p.id} className='flex justify-between gap-3'>
                    <span className='min-w-0 break-words'>
                      Recibió de {nameOf(p.fromId)} · {formatDate(p.date)}
                    </span>
                    <span className='shrink-0 tabular-nums'>
                      −{formatAmount(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Collapsible.Content>
      </Collapsible.Root>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-baseline justify-between gap-3'>
      <dt>{label}</dt>
      <dd className='tabular-nums'>{value}</dd>
    </div>
  );
}
