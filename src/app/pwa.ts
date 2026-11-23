import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

/**
 * Registers the service worker (production only: it does nothing in dev).
 * When a new version is ready it shows a toast that stays until the user
 * reloads; the page is never reloaded on its own, so an open form is not lost.
 */
export function registerServiceWorker() {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast('Hay una nueva versión de Dividy', {
        duration: Infinity,
        action: { label: 'Recargar', onClick: () => void updateSW(true) },
      });
    },
  });
}
