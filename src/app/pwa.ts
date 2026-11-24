import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

/**
 * Tells the user a new version is ready. The toast stays until they act
 * (`duration: Infinity`) and "Recargar" activates the waiting service worker
 * and reloads the page (`updateSW(true)`); nothing reloads on its own, so an
 * open form is never lost.
 */
export function showUpdateToast(updateSW: (reloadPage?: boolean) => unknown) {
  toast('Hay una nueva versión de Dividy', {
    duration: Infinity,
    action: { label: 'Recargar', onClick: () => void updateSW(true) },
  });
}

/**
 * Registers the service worker (production only: it does nothing in dev).
 * When a new version is ready it shows the update toast.
 */
export function registerServiceWorker() {
  const updateSW = registerSW({
    onNeedRefresh() {
      showUpdateToast(updateSW);
    },
  });
}
