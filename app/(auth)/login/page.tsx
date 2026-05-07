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
    <div className="box-border flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden bg-neutral-100 p-3 sm:p-4">
      <div className="flex min-h-0 w-full max-w-full flex-1 flex-col rounded-[30px] border border-black/10 bg-[#ececec] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_0_0_1px_rgba(0,0,0,0.03),0_18px_45px_rgba(0,0,0,0.08)] md:h-[calc(100dvh-24px)] md:min-h-0">
        <div
          className="flex min-h-0 flex-1 flex-col rounded-[22px] border border-black/5 p-3 sm:p-4 md:min-h-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, rgba(0,0,0,0.045) 0px, rgba(0,0,0,0.045) 1px, transparent 1px, transparent 5px)',
          }}
        >
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-black/5 bg-white/95 p-2 shadow-xl shadow-black/10">
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-b from-white/35 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-[1px] rounded-[17px] ring-1 ring-black/5" />
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[linear-gradient(180deg,transparent_52%,rgba(246,244,241,0.28)_100%)] opacity-[0.45]" aria-hidden />
            <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-full flex-col md:h-full md:w-[125%] md:origin-top-left md:scale-[0.8]">
                  {/* ── Upper: two-column area ── */}
                  <div className="flex items-center px-4 pt-8 pb-2 sm:px-8 md:px-16 md:pt-14">
                    <div className="grid w-full grid-cols-1 items-center gap-10 md:grid-cols-[2fr_3fr] md:gap-12">
                  {/* Left: Auth — single vertical rhythm: intro → card → social proof */}
                  <div className="flex max-w-sm flex-col">
                    <div className="flex flex-col gap-3">
                      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] text-neutral-600 shadow-[0_4px_14px_rgba(22,25,37,0.08)] backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#C79A7A]" />
                        Focused live rooms
                      </div>
                      <p className="text-[13px] font-medium text-neutral-700">
                        Study together in calm, real-time sessions
                      </p>
                      <p className="text-sm leading-relaxed text-neutral-400">
                        Continue with your provider to access rooms, timers, and
                        live study sessions.
                      </p>
                    </div>

                    <div className="mt-6 rounded-2xl bg-white/70 p-6 shadow-[0_2px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm">
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
                    transition-transform transition-colors duration-150 active:scale-[0.96] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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
                    transition-transform transition-colors duration-150 active:scale-[0.96] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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

                    <div className="mt-5 w-full max-w-[18.5rem]">
                      <p className="mb-2.5 text-[11px] text-neutral-400">
                        Join thousands of students studying live
                      </p>
                      <TestimonialAnimatedTooltip />
                    </div>
                  </div>

                  {/* Right: Card stack + barely-there ambient depth */}
                  <div className="min-w-0 max-w-[100%] pb-8 md:pb-0">
                    <div className="relative mx-auto w-full min-w-0 max-w-[58rem] px-2 py-4 sm:px-6 md:px-8">
                      <div
                        className="pointer-events-none absolute left-1/2 top-[46%] z-0 h-[min(380px,78vh)] w-[min(480px,92%)] -translate-x-1/2 -translate-y-1/2 opacity-[0.85]"
                        aria-hidden
                        style={{
                          background:
                            'radial-gradient(ellipse 55% 48% at 50% 48%, rgba(199,154,122,0.055) 0%, rgba(246,244,240,0.02) 42%, transparent 72%)',
                        }}
                      />
                      <div
                        className="pointer-events-none absolute inset-x-[6%] bottom-[8%] z-0 h-28 opacity-70 blur-2xl"
                        aria-hidden
                        style={{
                          background:
                            'radial-gradient(ellipse 70% 55% at 50% 80%, rgba(22,25,37,0.028) 0%, transparent 65%)',
                        }}
                      />
                      <div className="relative z-[1]">
                        <LandingCardStack className="h-[min(24rem,calc(100vw+4rem))] sm:h-[min(30rem,calc(100vw))] md:h-[36rem]" />
                      </div>
                    </div>
                  </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-[2] shrink-0 rounded-b-[14px] border-t border-black/[0.05] bg-[rgba(255,255,255,0.55)] px-3 py-2.5 backdrop-blur-[6px] sm:px-4 sm:py-3">
                <div className="flex justify-end">
                  <a
                    href="https://github.com/dexisback/ss-provider"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="please"
                    className="group relative inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#161925]/72 px-3 py-1.5 text-[11px] text-white/85 shadow-[0_6px_16px_rgba(22,25,37,0.22)] backdrop-blur-md transition-colors hover:bg-[#161925]/82"
                  >
                    <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-[#161925]/90 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100">
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
