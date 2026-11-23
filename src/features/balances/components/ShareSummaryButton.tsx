import { Copy, Share2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatGroupSummary, type Group } from '@/domain';

/**
 * Shares the group summary with the Web Share API when the browser has it
 * ("Compartir resumen"); otherwise copies it ("Copiar resumen"). If the user
 * closes the share sheet nothing is shown (it is not an error). If copying or
 * sharing fails, shows the text so it can be copied by hand.
 */
export function ShareSummaryButton({ group }: { group: Group }) {
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

  async function share() {
    const text = formatGroupSummary(group);
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
      <Button
        variant='outline'
        onClick={() =>
          void (canShare ? share() : copy(formatGroupSummary(group)))
        }
      >
        <Icon /> {canShare ? 'Compartir resumen' : 'Copiar resumen'}
      </Button>
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
