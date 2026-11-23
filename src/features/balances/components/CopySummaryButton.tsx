import { Copy } from 'lucide-react';
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
 * Copies the group summary to the clipboard. If the browser refuses (no
 * permission, insecure context), shows the text so it can be copied by hand.
 */
export function CopySummaryButton({ group }: { group: Group }) {
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  async function copy() {
    const text = formatGroupSummary(group);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Resumen copiado');
    } catch {
      setFallbackText(text);
    }
  }

  return (
    <>
      <Button variant='outline' onClick={() => void copy()}>
        <Copy /> Copiar resumen
      </Button>
      {fallbackText !== null && (
        <ResponsiveDialog
          open
          onOpenChange={(open) => !open && setFallbackText(null)}
          title='Copia el resumen'
          description='No pudimos copiarlo automáticamente. Selecciona el texto y cópialo.'
        >
          <div className='grid gap-3'>
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
