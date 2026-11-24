import { useState } from 'react';
import { Link, useLocation } from 'react-router';

import { PageDialog } from '@/components/page-dialog';
import { Card } from '@/components/ui/card';
import {
  describeViewerStatus,
  formatAmount,
  suggestTransfers,
  type ViewerStatus,
} from '@/domain';
import { LazyExplanationPlayer } from '@/features/explanation';
import { useCurrentGroup, useViewer } from '@/features/groups/data';
import { useSnapshotView } from '@/hooks/use-snapshot-view';
import { cn } from '@/lib/utils';
import { ShareSummaryButton } from './ShareSummaryButton';
import { MemberBalances } from './MemberBalances';
import { PaidVsShareChart } from './PaidVsShareChart';
import { PaymentsList } from './PaymentsList';
import { SuggestedTransfers } from './SuggestedTransfers';

/**
 * Balances tab: the group status with "Compartir resumen", what to pay,
 * payments already made and, under "Detalle", the chart and the balance per
 * member (with proof). In the read-only view of a snapshot the same screen
 * has no "Marcar como pagado" nor delete buttons.
 */
export function BalancesTab() {
  const group = useCurrentGroup();
  const snapshot = useSnapshotView();
  const { viewerId } = useViewer();
  const { hash } = useLocation();
  const [explaining, setExplaining] = useState(false);

  if (group.expenses.length === 0 && group.payments.length === 0) {
    return (
      <Card className='items-center gap-2 py-8 text-center'>
        <h2 className='text-lg font-semibold'>Aún no hay saldos</h2>
        <p className='max-w-xs text-sm text-muted-foreground'>
          Los saldos aparecen cuando agregas gastos.
        </p>
        <Link
          // A snapshot opened from a link keeps its data in the hash.
          to={{ pathname: '../expenses', hash }}
          className='font-medium underline underline-offset-2'
        >
          Ir a Gastos
        </Link>
      </Card>
    );
  }

  const transfers = suggestTransfers(group);
  const status = describeViewerStatus(group, viewerId);
  const settled = status.kind === 'group-settled';

  return (
    <div className='grid gap-5'>
      <section aria-labelledby='status-heading'>
        <Card
          className={cn(
            'gap-3 p-4',
            settled && 'bg-accent text-accent-foreground'
          )}
        >
          <StatusHeadline status={status} />
          <ShareSummaryButton group={group} snapshot={snapshot} />
        </Card>
      </section>
      {!settled && <SuggestedTransfers group={group} transfers={transfers} />}
      {group.payments.length > 0 && <PaymentsList group={group} />}
      <section aria-labelledby='detail-heading' className='grid gap-4'>
        <h2 id='detail-heading' className='text-sm font-semibold'>
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

const money = (amount: number) => (
  <span className='tabular-nums'>{formatAmount(amount)}</span>
);

/** The card's headline: about the group, or about you when we know who you are. */
function StatusHeadline({ status }: { status: ViewerStatus }) {
  switch (status.kind) {
    case 'group-settled':
      return (
        <div className='grid gap-0.5'>
          <h2 id='status-heading' className='text-xl font-bold'>
            ¡Están al día! 🎉
          </h2>
          <p className='text-sm'>Nadie le debe nada a nadie.</p>
        </div>
      );
    case 'general':
      return (
        <h2 id='status-heading' className='text-xl font-bold'>
          Pendiente: {money(status.pending)} por saldar
        </h2>
      );
    case 'owes':
      return (
        <div className='grid gap-0.5'>
          <h2 id='status-heading' className='text-xl font-bold'>
            Debes {money(status.amount)}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {status.payTo.length === 1
              ? `Transfiérele a ${status.payTo[0]}`
              : `Transfiere a ${status.payTo.length} personas`}
          </p>
        </div>
      );
    case 'owed':
      return (
        <h2 id='status-heading' className='text-xl font-bold'>
          Te deben {money(status.amount)}
        </h2>
      );
    case 'even':
      return (
        <div className='grid gap-0.5'>
          <h2 id='status-heading' className='text-xl font-bold'>
            Estás al día 🎉
          </h2>
          <p className='text-sm text-muted-foreground'>
            Al grupo le falta {money(status.groupPending)} por saldar
          </p>
        </div>
      );
  }
}
