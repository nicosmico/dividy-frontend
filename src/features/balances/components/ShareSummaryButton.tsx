import { Copy, Share2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatGroupSummary, type Group, type Snapshot } from '@/domain';
import {
  isSnapshotLinkSupported,
  useShareLink,
  type ShareLink,
} from '@/features/share';
import { formatDateTime } from '@/lib/dates';

const PRIVACY_NOTICE =
  'Incluye un link de solo lectura. Quien lo tenga verá los nombres, gastos y pagos del grupo.';

/**
 * Shares the group summary with the Web Share API when the browser has it
 * ("Compartir resumen"); otherwise copies it ("Copiar resumen"). If the user
 * closes the share sheet nothing is shown (it is not an error). If copying or
 * sharing fails, shows the text so it can be copied by hand.
 *
 * The text ends with "Ver el detalle: <link>", a read-only link to a capture
 * of the group (ADR 0006). When `snapshot` is given (the screen is the view of
 * a capture) the summary says "Cuentas al <fecha>" and the link is that same
 * capture.
 */
export function ShareSummaryButton({
  group,
  snapshot,
}: {
  group: Group;
  snapshot?: Snapshot | null;
}) {
  const { link, build } = useShareLink(group, snapshot);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Resumen copiado');
    } catch {
      setFallbackText(text);
    }
  }

  /** Uses the prepared link; builds it now if the click came first. */
  async function summaryText(): Promise<string> {
    const shareLink: ShareLink | null = link ?? (await build());
    return formatGroupSummary(group, {
      asOf: snapshot ? formatDateTime(snapshot.takenAt) : undefined,
      link: shareLink?.url,
    });
  }

  async function share() {
    const text = await summaryText();
    try {
      await navigator.share({ title: `Resumen de ${group.name}`, text });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await copy(text);
    }
  }

  const Icon = canShare ? Share2 : Copy;

  return (
    <>
      <div className='grid gap-1.5'>
        <Button
          variant='outline'
          onClick={() => void (canShare ? share() : summaryText().then(copy))}
        >
          <Icon /> {canShare ? 'Compartir resumen' : 'Copiar resumen'}
        </Button>
        {isSnapshotLinkSupported() && (
          <p className='text-sm text-muted-foreground'>{PRIVACY_NOTICE}</p>
        )}
      </div>
      {fallbackText !== null && (
        <ResponsiveDialog
          open
          onOpenChange={(open) => !open && setFallbackText(null)}
          title='Copia el resumen'
          description='No pudimos copiarlo automáticamente. Selecciona el texto y cópialo.'
        >
          <div className='grid grid-cols-[minmax(0,1fr)] gap-3'>
            <Textarea
              readOnly
              aria-label='Resumen del grupo'
              value={fallbackText}
              rows={10}
              onFocus={(event) => event.currentTarget.select()}
            />
            <ResponsiveDialogFooter>
              <Button onClick={() => setFallbackText(null)}>Cerrar</Button>
            </ResponsiveDialogFooter>
          </div>
        </ResponsiveDialog>
      )}
    </>
  );
}
