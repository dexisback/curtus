'use client';

import { useRef, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import {
  Focus,
  Library,
  Medal,
  Play,
  Square,
  SunMoon,
  Video,
} from 'lucide-react';
import { useSound } from '@/components/sound-provider';
import { useTheme } from '@/components/theme-provider';
import { useStudyTimer } from '@/components/study-timer-provider';
import { computeSelfTimerTotalSeconds } from '@/lib/timer-sync';

type DockItem =
  | {
      id: string;
      label: string;
      kind: 'link';
      href: string;
      icon: ComponentType<{
        size?: number;
        strokeWidth?: number;
        className?: string;
      }>;
    }
  | {
      id: 'theme';
      label: string;
      kind: 'theme';
      icon: typeof SunMoon;
    };

const DOCK_LINKS: DockItem[] = [
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    kind: 'link',
    href: '/leaderboard',
    icon: Medal,
  },
  {
    id: 'library',
    label: 'Library',
    kind: 'link',
    href: '/dashboard',
    icon: Library,
  },
  { id: 'rooms', label: 'Rooms', kind: 'link', href: '/rooms', icon: Video },
  { id: 'focus', label: 'Focus', kind: 'link', href: '/rooms', icon: Focus },
  { id: 'theme', label: 'Theme', kind: 'theme', icon: SunMoon },
];

function DockIcon({
  item,
  mouseX,
  onAction,
}: {
  item: DockItem;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  onAction: (item: DockItem) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const distance = useTransform(mouseX, (x) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 140;
    return x - (rect.left + rect.width / 2);
  });

  const size = useSpring(useTransform(distance, [-140, 0, 140], [46, 58, 46]), {
    stiffness: 320,
    damping: 24,
    mass: 0.35,
  });

  const y = useSpring(useTransform(distance, [-140, 0, 140], [0, -8, 0]), {
    stiffness: 320,
    damping: 24,
    mass: 0.35,
  });

  const Icon = item.icon;
  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ width: size, height: size, y }}
      whileTap={{ scale: 0.96 }}
      className="group relative flex items-center justify-center rounded-2xl border border-border/70
        bg-card/88 text-foreground/75 shadow-[0_1px_2px_rgba(17,24,39,0.06),0_7px_16px_rgba(17,24,39,0.08),inset_0_1px_0_rgba(255,255,255,0.45)]
        backdrop-blur-md transition-[color,background-color] duration-200 hover:text-foreground
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60
        dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_7px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.06)]"
      aria-label={item.label}
      onClick={() => onAction(item)}
    >
      <span
        className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md border border-border/60
          bg-popover/95 px-2 py-1 text-[11px] leading-none text-foreground/85 opacity-0
          shadow-[0_1px_2px_rgba(17,24,39,0.08)] backdrop-blur-sm
          transition-[opacity,transform] duration-200
          [transition-timing-function:cubic-bezier(0.2,0,0,0.1)]
          group-hover:-translate-y-0.5 group-hover:opacity-100
          dark:shadow-md"
      >
        {item.label}
      </span>
      <Icon size={18} strokeWidth={1.7} className="opacity-85" />
    </motion.button>
  );
}

/** Running session: mm:ss under 1 hour, else show hours field. */
function formatElapsed(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Completed focus today in seconds (`HH:MM:SS`) to match card/leaderboard timers. */
function formatTodayClock(totalSeconds: number): string {
  return formatElapsed(totalSeconds);
}

function StudyTimerDockControl() {
  const { active, elapsedSeconds, todaySeconds, redisAvailable, busy, toggle } =
    useStudyTimer();
  const { play } = useSound();
  const idleLabel = formatTodayClock(todaySeconds);

  /** Running: continue from today's logged minutes + current session (not a fresh 00:00 session). */
  const activeTotalSeconds = computeSelfTimerTotalSeconds({
    active,
    todaySeconds,
    elapsedSeconds,
  });

  return (
    <div className="mr-1 flex items-center gap-1.5 border-r border-border/50 pr-2">
      <span
        className="min-w-[2.75rem] tabular-nums text-[11px] font-medium text-muted-foreground"
        aria-live="polite"
      >
        {active ? formatElapsed(activeTotalSeconds) : idleLabel}
      </span>
      <motion.button
        type="button"
        style={{ width: 46, height: 46 }}
        whileTap={{ scale: 0.96 }}
        disabled={!redisAvailable || busy}
        title={
          !redisAvailable
            ? 'Study timer unavailable (Redis)'
            : active
              ? 'Stop study timer'
              : 'Start study timer'
        }
        aria-label={active ? 'Stop study timer' : 'Start study timer'}
        aria-pressed={active}
        onClick={() => {
          play('tap');
          void toggle();
        }}
        className="group relative flex shrink-0 items-center justify-center rounded-2xl border border-border/70
          bg-card/88 text-foreground/85 shadow-[0_1px_2px_rgba(17,24,39,0.06),0_7px_16px_rgba(17,24,39,0.08),inset_0_1px_0_rgba(255,255,255,0.45)]
          backdrop-blur-md transition-[color,background-color,opacity] duration-200 hover:text-foreground
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60
          disabled:pointer-events-none disabled:opacity-45
          dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_7px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.06)]"
      >
        <span
          className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60
            bg-popover/95 px-2 py-1 text-[11px] leading-none text-foreground/85 opacity-0
            shadow-[0_1px_2px_rgba(17,24,39,0.08)] backdrop-blur-sm
            transition-[opacity,transform] duration-200 [transition-timing-function:cubic-bezier(0.2,0,0,0.1)]
            group-hover:-translate-y-0.5 group-hover:opacity-100
            dark:shadow-md"
        >
          {active ? 'Stop timer' : 'Start timer'}
        </span>
        {active ? (
          <Square
            size={15}
            strokeWidth={2}
            fill="currentColor"
            className="opacity-90"
          />
        ) : (
          <Play
            size={17}
            strokeWidth={1.75}
            className="translate-x-[1px] opacity-90"
          />
        )}
      </motion.button>
    </div>
  );
}

function DockWithTheme({
  mouseX,
}: {
  mouseX: ReturnType<typeof useMotionValue<number>>;
}) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { play } = useSound();

  const onAction = (item: DockItem) => {
    if (item.kind === 'theme') {
      play(theme === 'dark' ? 'toggleOff' : 'toggleOn');
      toggleTheme();
      return;
    }
    play('tap');
    router.push(item.href);
  };

  return (
    <>
      <StudyTimerDockControl />
      {DOCK_LINKS.map((item) => (
        <DockIcon
          key={item.id}
          item={item}
          mouseX={mouseX}
          onAction={onAction}
        />
      ))}
    </>
  );
}

export default function FloatingDock() {
  const mouseX = useMotionValue<number>(Infinity);

  return (
    <motion.div
      initial={false}
      onMouseMove={(event) => mouseX.set(event.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="pointer-events-auto"
    >
      <div
        className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] flex h-[72px] items-end gap-2 rounded-3xl border border-border/60 px-3 pb-2.5 pt-2
          shadow-[0_1px_2px_rgba(17,24,39,0.04),0_10px_24px_rgba(17,24,39,0.12),inset_0_1px_0_rgba(255,255,255,0.5)]
          dark:border-border/50 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_10px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        <DockWithTheme mouseX={mouseX} />
      </div>
    </motion.div>
  );
}

// — Floating action dock (navigation shortcuts).
