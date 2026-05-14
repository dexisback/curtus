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
    <div className="box-border flex min-h-dvh w-full max-w-[100vw] flex-col overflow-x-hidden bg-[#f7f5f2] p-3 sm:p-4">
      <div className="flex min-h-0 w-full max-w-full flex-1 flex-col rounded-[30px] border border-black/[0.07] bg-[#eae8e4] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_0_0_1px_rgba(0,0,0,0.028),0_18px_48px_rgba(22,25,37,0.06)]">
        <div
          className="flex min-h-0 flex-1 flex-col rounded-[22px] border border-black/[0.05] p-3 sm:p-4 md:min-h-0"
          style={{
            backgroundColor: '#f2f0ec',
            /* First = paint order top: hatches must sit above washes or lines disappear */
            backgroundImage: `
              repeating-linear-gradient(-45deg, rgba(35,32,28,0.055) 0px, rgba(35,32,28,0.055) 1px, transparent 1px, transparent 5px),
              repeating-linear-gradient(45deg, rgba(35,32,28,0.028) 0px, rgba(35,32,28,0.028) 1px, transparent 1px, transparent 6px),
              radial-gradient(ellipse 130% 85% at 72% 12%, rgba(255,255,255,0.48) 0%, transparent 54%),
              radial-gradient(ellipse 70% 55% at 14% 88%, rgba(22,25,37,0.024) 0%, transparent 48%)
            `,
          }}
        >
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-black/[0.045] bg-[#ffffff] p-2 shadow-[0_24px_70px_rgba(22,25,37,0.052),0_2px_0_rgba(255,255,255,1)_inset]">
            {/* Sectional tonal zones — warm left / cooler right, subconscious */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[18px] opacity-[0.72]"
              aria-hidden
              style={{
                background:
                  'radial-gradient(ellipse 92% 78% at 22% 44%, rgba(253,251,248,0.98) 0%, transparent 58%)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-[18px] opacity-[0.58]"
              aria-hidden
              style={{
                background:
                  'radial-gradient(ellipse 95% 82% at 78% 46%, rgba(246,248,251,0.94) 0%, transparent 56%)',
              }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-b from-white/28 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-[1px] rounded-[17px] ring-1 ring-black/[0.035]" />
            <div
              className="pointer-events-none absolute inset-0 rounded-[18px] opacity-[0.38]"
              aria-hidden
              style={{
                background:
                  'linear-gradient(180deg, transparent 48%, rgba(243,241,237,0.22) 100%)',
              }}
            />
            {/* Drafting hatch on the main sheet — perceptible on white without noisy grain */}
            <div
              className="pointer-events-none absolute inset-0 z-0 rounded-[18px]"
              aria-hidden
              style={{
                opacity: 0.92,
                backgroundImage: `
                  repeating-linear-gradient(-42deg, rgba(22,25,37,0.038) 0px, rgba(22,25,37,0.038) 1px, transparent 1px, transparent 6px),
                  repeating-linear-gradient(42deg, rgba(22,25,37,0.02) 0px, rgba(22,25,37,0.02) 1px, transparent 1px, transparent 7px)
                `,
              }}
            />
            <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-full flex-col md:h-full">
                  {/* ── Upper: two-column area ── */}
                  <div className="flex items-center px-4 pt-8 pb-2 sm:px-8 md:px-16 md:pt-14">
                    <div className="grid w-full grid-cols-1 items-center gap-10 md:grid-cols-[2fr_3fr] md:gap-12">
                      {/* Left: Auth — single vertical rhythm: intro → card → social proof */}
                      <div className="flex max-w-sm flex-col">
                        <div className="flex flex-col gap-3">
                          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/[0.07] bg-[#faf9f7] px-3 py-1 text-[11px] text-neutral-600 shadow-[0_3px_14px_rgba(22,25,37,0.05)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#C79A7A]" />
                            Focused live rooms
                          </div>
                          <p className="text-[13px] font-medium text-neutral-700">
                            Study together in calm, real-time sessions
                          </p>
                          <p className="text-sm leading-relaxed text-neutral-400">
                            Continue with your provider to access rooms, timers,
                            and live study sessions.
                          </p>
                        </div>

                        <div className="mt-6 rounded-2xl border border-black/[0.045] bg-[#ffffff] p-6 shadow-[0_4px_44px_rgba(22,25,37,0.042),0_14px_48px_rgba(22,25,37,0.028)]">
                          <div className="flex flex-col gap-1 mb-5">
                            <h1 className="text-lg font-semibold text-foreground">
                              Sign in to curtus
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
                            Be amongst the first ones to try out the app
                          </p>
                          <TestimonialAnimatedTooltip />
                        </div>
                      </div>

                      {/* Right: cooler tonal pad + ambient glow / bloom */}
                      <div className="min-w-0 max-w-[100%] pb-8 md:pb-0">
                        <div className="relative mx-auto w-full min-w-0 max-w-[54rem] rounded-[22px] bg-gradient-to-br from-[#f9fafb]/88 via-[#f7f8fa]/55 to-[#f4f6f9]/72 px-2 py-4 ring-1 ring-black/[0.025] sm:px-6 md:px-8 md:from-[#f8fafc]/82 md:via-[#f6f8fb]/48 md:to-[#f3f6f9]/68">
                          <div
                            className="pointer-events-none absolute left-[52%] top-[42%] z-0 h-[min(420px,82vh)] w-[min(520px,96%)] -translate-x-1/2 -translate-y-1/2 opacity-[0.75]"
                            aria-hidden
                            style={{
                              background:
                                'radial-gradient(ellipse 62% 54% at 54% 46%, rgba(199,154,122,0.048) 0%, rgba(248,249,251,0.06) 38%, transparent 72%)',
                            }}
                          />
                          <div
                            className="pointer-events-none absolute right-[-8%] top-[18%] z-0 h-[min(280px,45vh)] w-[min(340px,55vw)] opacity-[0.35]"
                            aria-hidden
                            style={{
                              background:
                                'radial-gradient(circle at 70% 40%, rgba(230,236,245,0.45) 0%, transparent 62%)',
                            }}
                          />
                          <div
                            className="pointer-events-none absolute inset-x-[4%] bottom-[6%] z-0 h-32 opacity-60 blur-3xl"
                            aria-hidden
                            style={{
                              background:
                                'radial-gradient(ellipse 72% 58% at 50% 82%, rgba(22,25,37,0.034) 0%, transparent 68%)',
                            }}
                          />
                          <div className="relative z-[1]">
                            <LandingCardStack className="h-[min(24rem,calc(100vw+4rem))] sm:h-[min(30rem,calc(100vw))] md:h-[34rem]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none fixed bottom-4 right-12 z-[250] sm:bottom-6 sm:right-16">
                <a
                  href="https://github.com/dexisback/ss-provider"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Star on GitHub"
                  className="pointer-events-auto group relative inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#161925]/72 px-3 py-1.5 text-[11px] text-white/85 shadow-[0_6px_16px_rgba(22,25,37,0.22)] backdrop-blur-md transition-colors hover:bg-[#161925]/82"
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#161925]/90 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100">
                    Open repo
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
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f5f2]" />}>
      <LoginPageContent />
    </Suspense>
  );
}

// — Login page (OAuth via Better Auth client).
