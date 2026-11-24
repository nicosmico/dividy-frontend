import { useState } from 'react';
import { Link } from 'react-router';

import { ResponsiveDialog } from '@/components/responsive-dialog';
import { Card } from '@/components/ui/card';
import { isSettled, suggestTransfers } from '@/domain';
import { LazyExplanationPlayer } from '@/features/explanation';
import { useCurrentGroup } from '@/features/groups/data';
import { ShareSummaryButton } from './ShareSummaryButton';
import { MemberBalances } from './MemberBalances';
import { PaidVsShareChart } from './PaidVsShareChart';
import { PaymentsList } from './PaymentsList';
import { SuggestedTransfers } from './SuggestedTransfers';

/** Balances tab: what to pay, balance per member (with proof), payments and summary. */
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
      {group.expenses.length > 0 && (
        <PaidVsShareChart group={group} onExplain={() => setExplaining(true)} />
      )}
      {settled ? (
        <Card className='items-center gap-1 bg-accent py-6 text-center text-accent-foreground'>
          <h2 className='text-xl font-bold'>¡Están al día! 🎉</h2>
          <p className='text-sm'>Nadie le debe nada a nadie.</p>
        </Card>
      ) : (
        <SuggestedTransfers group={group} transfers={transfers} />
      )}
      <MemberBalances group={group} />
      {group.payments.length > 0 && <PaymentsList group={group} />}
      <ShareSummaryButton group={group} />
      <ResponsiveDialog
        open={explaining}
        onOpenChange={setExplaining}
        title='Cómo se calculó'
        initialFocus='dialog'
        flush
        description={`Así salen los saldos de ${group.name}, con sus gastos y pagos.`}
      >
        <LazyExplanationPlayer
          group={group}
          label={`Cómo se calculó el saldo de ${group.name}`}
          layout='sheet'
        />
      </ResponsiveDialog>
    </div>
  );
}
