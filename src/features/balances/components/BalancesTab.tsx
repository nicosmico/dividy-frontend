import { useState } from 'react';
import { Link } from 'react-router';

import { PageDialog } from '@/components/page-dialog';
import { Card } from '@/components/ui/card';
import {
  formatAmount,
  getPendingAmount,
  isSettled,
  suggestTransfers,
} from '@/domain';
import { LazyExplanationPlayer } from '@/features/explanation';
import { useCurrentGroup } from '@/features/groups/data';
import { cn } from '@/lib/utils';
import { ShareSummaryButton } from './ShareSummaryButton';
import { MemberBalances } from './MemberBalances';
import { PaidVsShareChart } from './PaidVsShareChart';
import { PaymentsList } from './PaymentsList';
import { SuggestedTransfers } from './SuggestedTransfers';

/**
 * Balances tab: the group status with "Compartir resumen", what to pay,
 * payments already made and, under "Detalle", the chart and the balance per
 * member (with proof).
 */
export function BalancesTab() {
  const group = useCurrentGroup();
  const [explaining, setExplaining] = useState(false);

  if (group.expenses.length === 0 && group.payments.length === 0) {
    return (
      <Card className='items-center gap-2 py-8 text-center'>
        <h2 className='text-lg font-semibold'>Aún no hay saldos</h2>
        <p className='max-w-xs text-sm text-muted-foreground'>
          Los saldos aparecen cuando agregas gastos.
        </p>
        <Link
          to='../expenses'
          className='font-medium underline underline-offset-2'
        >
          Ir a Gastos
        </Link>
      </Card>
    );
  }

  const transfers = suggestTransfers(group);
  const settled = isSettled(group);

  return (
    <div className='grid gap-5'>
      <section aria-labelledby='status-heading'>
        <Card
          className={cn(
            'gap-3 p-4',
            settled && 'bg-accent text-accent-foreground'
          )}
        >
          {settled ? (
            <div className='grid gap-0.5'>
              <h2 id='status-heading' className='text-xl font-bold'>
                ¡Están al día! 🎉
              </h2>
              <p className='text-sm'>Nadie le debe nada a nadie.</p>
            </div>
          ) : (
            <h2 id='status-heading' className='text-xl font-bold'>
              Pendiente:{' '}
              <span className='tabular-nums'>
                {formatAmount(getPendingAmount(group))}
              </span>{' '}
              por saldar
            </h2>
          )}
          <ShareSummaryButton group={group} />
        </Card>
      </section>
      {!settled && <SuggestedTransfers group={group} transfers={transfers} />}
      {group.payments.length > 0 && <PaymentsList group={group} />}
      <section aria-labelledby='detail-heading' className='grid gap-4'>
        <h2 id='detail-heading' className='text-lg font-bold'>
          Detalle
        </h2>
        {group.expenses.length > 0 && (
          <PaidVsShareChart
            group={group}
            onExplain={() => setExplaining(true)}
          />
        )}
        <MemberBalances group={group} />
      </section>
      <PageDialog
        open={explaining}
        onOpenChange={setExplaining}
        title='Cómo se calculó'
        description={group.name}
      >
        <LazyExplanationPlayer
          group={group}
          label={`Cómo se calculó el saldo de ${group.name}`}
          layout='page'
        />
      </PageDialog>
    </div>
  );
}
