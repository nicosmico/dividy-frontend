import { Play } from 'lucide-react';
import { useMemo, useState } from 'react';

import { BalanceLabel } from '@/components/balance-label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatAmount, type Group } from '@/domain';
import {
  buildExplanation,
  buildLegend,
  fillStyle,
  PaidShareRow,
  type Explanation,
} from '@/features/explanation';
import { EntityIcon } from '@/features/icons';
import { useMemberMoods } from '@/features/members';

interface PaidVsShareChartProps {
  group: Group;
  /** Opens the step-by-step explanation. */
  onExplain: () => void;
}

/**
 * "Gastó vs. su parte" (decision 92): two horizontal bars per member split by
 * expense, on one common scale, with a legend, tooltips on the segments and an
 * equivalent table. Everything comes from `buildExplanation`.
 */
export function PaidVsShareChart({ group, onExplain }: PaidVsShareChartProps) {
  const explanation = useMemo(() => buildExplanation(group), [group]);
  const moods = useMemberMoods(group);
  // Key of the segment whose tooltip is open: one at a time.
  const [active, setActive] = useState<string | null>(null);
  const expenseById = useMemo(
    () => new Map(explanation.expenses.map((e) => [e.id, e])),
    [explanation]
  );
  const tooltips = { active, setActive };

  return (
    <section aria-labelledby='chart-heading'>
      <Card className='gap-4 rounded-card p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h3 id='chart-heading' className='text-base font-bold'>
            Gastó vs. su parte
          </h3>
          <Button variant='accent' size='sm' onClick={onExplain}>
            <Play aria-hidden='true' className='fill-current' />
            Ver cómo se calculó
          </Button>
        </div>

        <ul className='grid gap-4'>
          {explanation.members.map((m) => (
            <PaidShareRow
              key={m.member.id}
              member={m.member}
              mood={moods.get(m.member.id)}
              balance={m.balance}
              paid={{ slices: m.paidSlices, total: m.paid }}
              share={{ slices: m.shareSlices, total: m.share }}
              scaleMax={explanation.scaleMax}
              colors={explanation.colors}
              expenseById={expenseById}
              tooltips={tooltips}
            />
          ))}
        </ul>

        <Legend explanation={explanation} />
        <TableAlternative group={group} explanation={explanation} />
      </Card>
    </section>
  );
}

function Legend({ explanation }: { explanation: Explanation }) {
  const entries = buildLegend(explanation);
  return (
    <ul
      aria-label='Leyenda de gastos'
      className='grid grid-cols-2 gap-x-3 gap-y-2.5 border-t pt-3'
    >
      {entries.map((entry) => (
        <li key={entry.key} className='flex min-w-0 items-center gap-2'>
          <EntityIcon
            text={entry.expense?.description ?? ''}
            kind='expense'
            size='legend'
          />
          <span
            aria-hidden='true'
            className='h-3 w-4 shrink-0 rounded-[3px] ring-1 ring-foreground/15 ring-inset'
            style={fillStyle(entry.color)}
          />
          <span className='min-w-0 text-xs leading-tight'>
            <span className='block font-semibold break-words'>
              {entry.label}
            </span>
            <span className='block text-muted-foreground tabular-nums'>
              {formatAmount(entry.total)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The same numbers as the chart, as tables (one per member). */
function TableAlternative({
  group,
  explanation,
}: {
  group: Group;
  explanation: Explanation;
}) {
  return (
    <details className='group/table border-t pt-3 text-sm'>
      <summary className='flex min-h-11 cursor-pointer items-center rounded-lg font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/40'>
        Ver como tabla
      </summary>
      <div className='grid gap-4 pt-2'>
        {explanation.members.map((m) => {
          const rows = explanation.expenses
            .map((expense) => ({
              expense,
              paid:
                m.paidSlices.find((s) => s.expenseId === expense.id)?.amount ??
                0,
              share:
                m.shareSlices.find((s) => s.expenseId === expense.id)?.amount ??
                0,
            }))
            .filter((row) => row.paid > 0 || row.share > 0);
          return (
            <table key={m.member.id} className='w-full text-left'>
              <caption className='pb-1 text-left font-semibold'>
                {m.member.name} · <BalanceLabel balance={m.balance} />
              </caption>
              <thead className='text-xs text-muted-foreground'>
                <tr>
                  <th scope='col' className='py-1 pr-2 font-medium'>
                    Gasto
                  </th>
                  <th scope='col' className='py-1 text-right font-medium'>
                    Gastó
                  </th>
                  <th scope='col' className='py-1 pl-2 text-right font-medium'>
                    Su parte
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ expense, paid, share }) => (
                  <tr key={expense.id} className='border-t'>
                    <th
                      scope='row'
                      className='py-1 pr-2 font-normal break-words'
                    >
                      {expense.description}
                    </th>
                    <td className='py-1 text-right tabular-nums'>
                      {formatAmount(paid)}
                    </td>
                    <td className='py-1 pl-2 text-right tabular-nums'>
                      {formatAmount(share)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className='border-t font-semibold'>
                  <th scope='row' className='py-1 pr-2 text-left'>
                    Total
                  </th>
                  <td className='py-1 text-right tabular-nums'>
                    {formatAmount(m.paid)}
                  </td>
                  <td className='py-1 pl-2 text-right tabular-nums'>
                    {formatAmount(m.share)}
                  </td>
                </tr>
              </tfoot>
            </table>
          );
        })}
        {group.payments.length > 0 && (
          <p className='text-muted-foreground'>
            Los saldos incluyen los pagos ya registrados.
          </p>
        )}
      </div>
    </details>
  );
}
