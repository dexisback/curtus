'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Global app error boundary caught exception', {
      event_name: 'ui.global_error',
      error_code: 'UI_GLOBAL_ERROR',
      name: error.name,
      message: error.message,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <html>
      <body className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <div className="max-w-md space-y-3 text-center">
          <h2 className="text-xl font-semibold">Something went wrong.</h2>
          <p className="text-sm text-foreground/70">
            We logged the error. Try again, and if it keeps happening, refresh
            the page.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
