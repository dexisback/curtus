'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  LibraryBig,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Trophy,
  UserCircle,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useServerUserSettings } from '@/components/server-user-settings';
import { useMobileNav } from '@/components/mobile-nav-context';
import { useSound } from '@/components/sound-provider';
import WhiteNoiseSidebarSection from '@/components/white-noise-sidebar-section';
import { DURATION, EASE_IN, EASE_OUT, SPRING_SNAP } from '@/lib/ui-motion';
import { useMediaQuery } from '@/hooks/use-media-query';

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Rooms', href: '/rooms', icon: Video },
  { label: 'Library', href: '/library', icon: LibraryBig },
  { label: 'Todo', href: '/dashboard/todo', icon: CheckSquare },
  { label: 'Profile', href: '/profile', icon: UserCircle },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.036, delayChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8, filter: 'blur(3px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: DURATION.medium, ease: EASE_OUT },
  },
};

const itemExit = {
  opacity: 0,
  x: -6,
  filter: 'blur(3px)',
  transition: { duration: DURATION.fast, ease: EASE_IN },
};

function CreateRoomModal({ onExited }: { onExited: () => void }) {
  const router = useRouter();
  const { play } = useSound();
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const requestClose = useCallback(() => {
    play('modalClose');
    setOpen(false);
  }, [play]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, requestClose]);

  useEffect(() => {
    if (open && mounted) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), isPublic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create room.');
        return;
      }
      play('success');
      requestClose();
      router.push(`/room/${data.code}`);
    } catch {
      play('error');
      setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence initial={false} onExitComplete={onExited}>
      {open && (
        <motion.div
          key="create-room-overlay"
          className="fixed inset-0 z-[210] flex max-h-[100dvh] items-end justify-center overflow-y-auto overflow-x-hidden p-4 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: DURATION.fast, ease: EASE_IN },
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) requestClose();
          }}
        >
          <div
            className="absolute inset-0 bg-background/25"
            style={{
              backdropFilter: 'blur(8px) saturate(1.1)',
              WebkitBackdropFilter: 'blur(8px) saturate(1.1)',
            }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 my-auto w-full max-w-sm sm:my-0"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: 4,
              scale: 0.985,
              transition: { duration: DURATION.fast, ease: EASE_IN },
            }}
            transition={SPRING_SNAP}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="shadow-float rounded-2xl border border-border/40 bg-card/97 p-5 ring-1 ring-inset ring-black/[0.035] dark:border-border/50 dark:bg-card/95 dark:ring-white/[0.06]
                dark:shadow-[0_2px_4px_rgb(0_0_0/0.28),0_22px_52px_rgb(0_0_0/0.32),inset_0_1px_0_rgb(255_255_255/0.05)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2
                  id={titleId}
                  className="text-sm font-semibold text-foreground"
                >
                  Create a room
                </h2>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  aria-label="Close"
                  onClick={requestClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground
                    hover:bg-muted/60 hover:text-foreground transition-colors duration-150"
                >
                  <X size={14} strokeWidth={1.75} />
                </motion.button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="room-name"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Room name
                  </label>
                  <input
                    ref={inputRef}
                    id="room-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    required
                    placeholder="e.g. Late night grind"
                    className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-[12.5px]
                      text-foreground placeholder:text-muted-foreground/50
                      focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow duration-150"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2">
                  <span className="text-[11.5px] text-foreground/80">
                    Public room
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPublic}
                    onClick={() => setIsPublic((v) => !v)}
                    className="relative h-6 w-11 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/50"
                    style={{
                      background: isPublic
                        ? 'var(--color-cta)'
                        : 'oklch(0.82 0.005 75)',
                    }}
                  >
                    <motion.span
                      className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                      animate={{
                        left: isPublic ? 'calc(100% - 1.375rem)' : '0.125rem',
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 28,
                      }}
                    />
                  </button>
                </div>

                {error && (
                  <p role="alert" className="text-[11px] text-destructive">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={requestClose}
                    className="flex-1 rounded-lg border border-border/70 bg-card/80 py-2 text-[11.5px]
                      font-medium text-foreground/80 hover:bg-accent/60 transition-colors duration-150"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.96 }}
                    disabled={busy || !name.trim()}
                    className="app-cta-surface flex-1 rounded-lg py-2 text-[11.5px] font-medium text-cta-foreground
                      disabled:pointer-events-none disabled:opacity-50"
                  >
                    {busy ? 'Creating…' : 'Create room'}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default function Sidebar({ userName }: { userName?: string | null }) {
  const server = useServerUserSettings();
  const trimmed = userName?.trim();
  const greetingName = trimmed ? trimmed : 'there';
  const [isOpen, setIsOpen] = useState(() => {
    if (server) return !server.compactSidebar;
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('swm:compact-sidebar') !== '1';
    } catch {
      return true;
    }
  });
  const [createMounted, setCreateMounted] = useState(false);
  const pathname = usePathname();
  const lgUp = useMediaQuery('(min-width: 1024px)');
  const { mobileNavOpen, closeMobileNav } = useMobileNav();
  const { play } = useSound();
  const isOpenRef = useRef(isOpen);
  useLayoutEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const toggleSidebarWidth = useCallback(() => {
    play('tap');
    const next = !isOpenRef.current;
    setIsOpen(next);
    try {
      localStorage.setItem('swm:compact-sidebar', next ? '0' : '1');
    } catch {
      // ignore
    }
    queueMicrotask(() => {
      try {
        window.dispatchEvent(new CustomEvent('app:compact-sidebar-changed'));
      } catch {
        // ignore
      }
    });
    void fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compactSidebar: !next }),
    }).catch(() => {});
  }, [play]);

  useLayoutEffect(() => {
    if (!server) return;
    try {
      localStorage.setItem(
        'swm:compact-sidebar',
        server.compactSidebar ? '1' : '0',
      );
    } catch {}
  }, [server]);

  useEffect(() => {
    const handler = () => {
      try {
        const compact = localStorage.getItem('swm:compact-sidebar') === '1';
        setIsOpen(!compact);
      } catch {}
    };
    window.addEventListener(
      'app:compact-sidebar-changed',
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        'app:compact-sidebar-changed',
        handler as EventListener,
      );
    };
  }, []);

  const openCreate = useCallback(() => {
    play('modalOpen');
    setCreateMounted(true);
  }, [play]);

  useEffect(() => {
    closeMobileNav();
  }, [pathname, closeMobileNav]);

  useEffect(() => {
    if (!lgUp) return;
    closeMobileNav();
  }, [lgUp, closeMobileNav]);

  useEffect(() => {
    if (lgUp || !mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lgUp, mobileNavOpen]);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  const revealNavLinks = lgUp ? isOpen : mobileNavOpen;

  function handleNavHeaderTap() {
    play('tap');
    if (!lgUp) {
      closeMobileNav();
      return;
    }
    toggleSidebarWidth();
  }

  return (
    <>
      <AnimatePresence>
        {!lgUp && mobileNavOpen && (
          <motion.button
            key="mobile-sidebar-backdrop"
            type="button"
            aria-label="Close navigation"
            title="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            className="fixed inset-0 z-[132] bg-background/48 backdrop-blur-[5px]
              dark:bg-background/52 lg:hidden"
            onClick={closeMobileNav}
          />
        )}
      </AnimatePresence>

      <motion.aside
        id="dashboard-sidebar"
        initial={false}
        animate={
          lgUp
            ? { x: 0, width: isOpen ? '13rem' : '3.5rem' }
            : { x: mobileNavOpen ? 0 : '-100%', width: '13rem' }
        }
        transition={
          lgUp
            ? { type: 'spring', stiffness: 380, damping: 32 }
            : { type: 'spring', stiffness: 400, damping: 34 }
        }
        className="fixed inset-y-0 left-0 z-[140] flex min-h-dvh w-[min(17rem,calc(100vw-2.75rem))]
          shrink-0 flex-col overflow-hidden border-r border-border/35 bg-muted/50 bg-[image:var(--panel-texture-image)] bg-[length:340px_340px]
          shadow-[0_14px_40px_rgb(22_25_37/0.1),inset_-1px_0_0_rgba(255,255,255,0.52),inset_-10px_0_20px_-14px_rgba(22,25,37,0.05),inset_0_0_0_1px_rgba(22,25,37,0.02)]
          dark:border-border/50 dark:bg-[color:var(--panel-texture-bg)] dark:shadow-[0_16px_44px_rgb(0_0_0/0.38),inset_-1px_0_0_rgba(255,255,255,0.04),inset_-12px_0_24px_-12px_rgb(0_0_0/0.32)]
          lg:sticky lg:top-0 lg:self-start lg:inset-auto lg:z-auto lg:h-dvh lg:min-h-dvh lg:w-auto lg:max-h-dvh lg:shadow-[inset_-1px_0_0_rgba(255,255,255,0.52),inset_-10px_0_20px_-14px_rgba(22,25,37,0.05),inset_0_0_0_1px_rgba(22,25,37,0.02)]
          dark:lg:shadow-[inset_-1px_0_0_rgba(255,255,255,0.04),inset_-12px_0_24px_-12px_rgb(0_0_0/0.32)]"
      >
        {(lgUp || mobileNavOpen) && (
          <motion.button
            type="button"
            onClick={handleNavHeaderTap}
            whileTap={{ scale: 0.96 }}
            className="m-0.5 flex min-h-[44px] min-w-[44px] h-[3.5rem] w-[3.5rem] shrink-0 cursor-pointer items-center justify-center
            rounded-lg transition-colors duration-150 hover:bg-accent/60"
            aria-label={
              lgUp
                ? isOpen
                  ? 'Collapse sidebar'
                  : 'Expand sidebar'
                : 'Close menu'
            }
          >
            {lgUp ? (
              <AnimatePresence mode="wait" initial={false}>
                {isOpen ? (
                  <motion.span
                    key="close"
                    className="flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{
                      opacity: 0,
                      scale: 0.25,
                      filter: 'blur(4px)',
                      transition: { duration: DURATION.fast, ease: EASE_IN },
                    }}
                    transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                  >
                    <X size={16} strokeWidth={1.5} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    className="flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{
                      opacity: 0,
                      scale: 0.25,
                      filter: 'blur(4px)',
                      transition: { duration: DURATION.fast, ease: EASE_IN },
                    }}
                    transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                  >
                    <Menu size={16} strokeWidth={1.5} />
                  </motion.span>
                )}
              </AnimatePresence>
            ) : (
              <span className="flex items-center justify-center">
                <X size={16} strokeWidth={1.5} />
              </span>
            )}
          </motion.button>
        )}

        <AnimatePresence>
          {revealNavLinks && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={containerVariants}
              className="flex flex-1 flex-col overflow-hidden px-2.5 pb-4"
            >
              <motion.p
                variants={itemVariants}
                exit={itemExit}
                className="mb-4 px-1.5 text-[12px] font-medium text-foreground/60"
              >
                Hi, {greetingName}
              </motion.p>

              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <motion.div
                      key={item.label}
                      variants={itemVariants}
                      exit={itemExit}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          play('tap');
                          if (!lgUp) closeMobileNav();
                        }}
                        className={
                          'flex min-h-[42px] items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg px-2.5 py-[9px] ' +
                          'text-[11.5px] font-medium transition-[background-color,color] duration-150 ' +
                          (active
                            ? 'bg-[color:color-mix(in_oklch,var(--color-cta)_14%,white)] text-foreground shadow-[inset_0_0_0_1px_rgba(199,154,122,0.28)] dark:text-[#161925] dark:shadow-[inset_0_0_0_1px_rgba(22,25,37,0.08)]'
                            : 'text-foreground/70 hover:bg-accent/55 hover:text-foreground')
                        }
                      >
                        <item.icon
                          size={15}
                          strokeWidth={1.6}
                          className={
                            active
                              ? 'opacity-80 shrink-0'
                              : 'opacity-55 shrink-0'
                          }
                        />
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                variants={itemVariants}
                exit={itemExit}
                className="mt-2 shrink-0"
              >
                <WhiteNoiseSidebarSection />
              </motion.div>

              <motion.button
                type="button"
                variants={itemVariants}
                exit={itemExit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (!lgUp) closeMobileNav();
                  openCreate();
                }}
                className="app-cta-surface mt-2 flex h-11 min-h-[44px] w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-cta/20
                  px-4 py-2.5 text-[11.5px] font-medium text-cta-foreground
                  whitespace-nowrap transition-transform duration-150"
              >
                <Plus size={13} strokeWidth={2} />
                Create New
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {createMounted && (
        <CreateRoomModal onExited={() => setCreateMounted(false)} />
      )}
    </>
  );
}

// — sideBar.tsx: Collapsible nav, greeting, create-room modal (portal). Syncs compact sidebar with /api/settings and localStorage.
