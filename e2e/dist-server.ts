import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

export interface DistServer {
  /** `http://localhost:<port>`: its own origin, so its service worker is its own. */
  origin: string;
  /** From now on `/sw.js` carries an extra comment: the browser sees a new build. */
  publishNewVersion(label: string): void;
  close(): Promise<void>;
}

/**
 * Serves the production build (`dist/`) on a free port, like `vite preview`,
 * but lets a test "deploy" a new version without touching the files on disk:
 * the service worker is the only file that changes, and any byte change in it
 * is a new version for the browser. A separate origin per test keeps the
 * service workers of parallel tests (and of the shared preview server) apart.
 */
export async function serveDist(): Promise<DistServer> {
  let version = '';
  const server: Server = createServer((req, res) => {
    void (async () => {
      const path = decodeURIComponent((req.url ?? '/').split(/[?#]/)[0]);
      let file = normalize(join(DIST, path));
      if (!file.startsWith(DIST)) {
        res.writeHead(403).end();
        return;
      }
      try {
        let body: Buffer | string;
        try {
          body = await readFile(file);
        } catch {
          // Unknown paths get the app shell, like the real hosting does.
          file = join(DIST, 'index.html');
          body = await readFile(file);
        }
        const isWorker = file === join(DIST, 'sw.js');
        if (isWorker && version) {
          body = `${body.toString()}\n// new version: ${version}\n`;
        }
        res.writeHead(200, {
          'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
          // The service worker must never be served from the HTTP cache.
          'cache-control': isWorker ? 'no-store' : 'no-cache',
        });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://localhost:${port}`,
    publishNewVersion(label) {
      version = label;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
