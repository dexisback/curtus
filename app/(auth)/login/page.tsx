'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import LandingCardStack from '@/components/landing-card-stack';
import TestimonialAnimatedTooltip from '@/components/testimonial-animated-tooltip';

const ERROR_MESSAGES: Record<string, string> = {
  oauth: 'OAuth sign-in failed. Please try again.',
  'account-not-linked':
    'An account with this email already exists. Sign in with your original provider.',
};

function LoginPageContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';
  const errorKey = searchParams.get('error') ?? '';
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<
    'google' | 'github' | null
  >(null);
  const errorMessage = authError ?? ERROR_MESSAGES[errorKey] ?? null;

  async function handleSocial(provider: 'google' | 'github') {
    if (pendingProvider) return;
    setAuthError(null);
    setPendingProvider(provider);
    try {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL ?? '');
      const callbackURL = `${origin}${next.startsWith('/') ? next : `/${next}`}`;
      const errorCallbackURL = `${origin}/login?error=oauth&next=${encodeURIComponent(next)}`;

      const result = await signIn.social({
        provider,
        callbackURL,
        errorCallbackURL,
      });
      const redirectUrl =
        (result as { data?: { url?: string } } | null)?.data?.url ??
        (result as { url?: string } | null)?.url;
      if (redirectUrl && typeof window !== 'undefined') {
        window.location.assign(redirectUrl);
        return;
      }
      setAuthError(
        'OAuth sign-in could not start. Check auth callback URLs and try again.',
      );
      setPendingProvider(null);
    } catch {
      setAuthError('OAuth sign-in failed. Please try again.');
      setPendingProvider(null);
    }
  }

  const isPending = pendingProvider !== null;

  return (
    <div className="box-border h-screen w-full overflow-hidden bg-neutral-100 p-3 sm:p-4">
      <div className="h-full w-full max-w-full rounded-[30px] border border-black/10 bg-[#ececec] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_0_0_1px_rgba(0,0,0,0.03),0_18px_45px_rgba(0,0,0,0.08)]">
        <div
          className="h-full rounded-[22px] border border-black/5 p-3 sm:p-4"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 5px)',
          }}
        >
          <div className="relative h-full overflow-hidden rounded-[18px] border border-black/5 bg-white/95 p-2 shadow-xl shadow-black/10">
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-b from-white/35 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-[1px] rounded-[17px] ring-1 ring-black/5" />
            <div className="flex h-full w-[125%] origin-top-left scale-[0.8] flex-col">
              {/* ── Upper: two-column area ── */}
              <div className="flex items-center px-10 md:px-16 pt-14 pb-2">
                <div className="w-full grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-12 items-center">
                  {/* Left: Auth */}
                  <div className="flex flex-col gap-5 max-w-sm">
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Continue with your provider to access rooms, timers, and
                      live study sessions.
                    </p>

                    <div className="rounded-2xl bg-white/70 p-6 shadow-[0_2px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm">
                      <div className="flex flex-col gap-1 mb-5">
                        <h1 className="text-lg font-semibold text-foreground">
                          Sign in to StudyWithMe
                        </h1>
                        <p className="text-xs text-muted-foreground">
                          Choose a provider to continue
                        </p>
                      </div>

                      {errorMessage && (
                        <p
                          role="alert"
                          className="mb-4 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                        >
                          {errorMessage}
                        </p>
                      )}

                      <div className="flex flex-col gap-2.5">
                        <button
                          type="button"
                          onClick={() => void handleSocial('google')}
                          disabled={isPending}
                          className="flex items-center justify-center gap-3 w-full rounded-lg border border-border
                    bg-background hover:bg-accent text-foreground text-sm font-medium h-10 px-4
                    transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          {pendingProvider === 'google'
                            ? 'Redirecting…'
                            : 'Continue with Google'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleSocial('github')}
                          disabled={isPending}
                          className="flex items-center justify-center gap-3 w-full rounded-lg border border-border
                    bg-background hover:bg-accent text-foreground text-sm font-medium h-10 px-4
                    transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                          </svg>
                          {pendingProvider === 'github'
                            ? 'Redirecting…'
                            : 'Continue with GitHub'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 w-full max-w-[18.5rem]">
                      <p className="mb-2 text-[11px] text-neutral-400">
                        Join thousands of students studying live
                      </p>
                      <TestimonialAnimatedTooltip />
                    </div>
                  </div>

                  {/* Right: Card stack */}
                  <div className="min-w-0">
                    <div className="mx-auto w-full max-w-[58rem] min-w-0 rounded-2xl px-8 py-4">
                      <LandingCardStack className="h-[36rem]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <a
              href="https://github.com/dexisback/ss-provider"
              target="_blank"
              rel="noreferrer"
              aria-label="please"
              className="group absolute bottom-5 right-5 z-20 inline-flex items-center gap-2 rounded-full border border-black/10 bg-neutral-900/70 px-3 py-1.5 text-[11px] text-white/85 shadow-[0_6px_16px_rgba(0,0,0,0.2)] backdrop-blur-md transition-colors hover:bg-neutral-900/80"
            >
              <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-black/85 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100">
                please
              </span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-100" />}>
      <LoginPageContent />
    </Suspense>
  );
}

// — Login page (OAuth via Better Auth client).
