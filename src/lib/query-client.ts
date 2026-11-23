import { QueryClient } from '@tanstack/react-query';

/**
 * Data is local and cheap: no retries (a failure is a real error, shown by the
 * error boundary) and no automatic garbage collection delay in tests.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, throwOnError: true },
      mutations: { retry: false },
    },
  });
}
