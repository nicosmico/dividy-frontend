import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { toast } from 'sonner';
import {
  CompressionStream as NodeCompressionStream,
  DecompressionStream as NodeDecompressionStream,
} from 'node:stream/web';
import { afterEach } from 'vitest';

// jsdom lacks a few browser APIs that Radix UI relies on.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// The vitest VM context has no CompressionStream; Node's is the same API
// browsers ship (snapshot links, ADR 0006).
globalThis.CompressionStream ??=
  NodeCompressionStream as unknown as typeof CompressionStream;
globalThis.DecompressionStream ??=
  NodeDecompressionStream as unknown as typeof DecompressionStream;

afterEach(() => {
  cleanup();
  // sonner keeps toasts in a module-level store and replays them to the next
  // <Toaster>; dismissing keeps one test's toasts out of the next one.
  toast.dismiss();
});
