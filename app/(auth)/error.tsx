'use client';

export default function AuthError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[100dvh] place-items-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h2 className="text-xl font-semibold">Auth page crashed</h2>
        <p className="text-sm text-foreground/70">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
