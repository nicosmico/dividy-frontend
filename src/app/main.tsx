import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/index.css';
import { App } from './App';
import { registerServiceWorker } from './pwa';
import { listenForStaleChunks } from './stale-chunks';

listenForStaleChunks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

registerServiceWorker();
