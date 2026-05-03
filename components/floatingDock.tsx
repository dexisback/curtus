"use client";

import { useRef, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Focus, Library, Medal, SunMoon, Video } from "lucide-react";
import { useSound } from "@/components/sound-provider";
import { useTheme } from "@/components/theme-provider";

type DockItem =
  | {
      id: string;
      label: string;
      kind: "link";
      href: string;
      icon: ComponentType<{
        size?: number;
        strokeWidth?: number;
        className?: string;
      }>;
    }
  | {
      id: "theme";
      label: string;
      kind: "theme";
      icon: typeof SunMoon;
    };

const DOCK_LINKS: DockItem[] = [
  { id: "leaderboard", label: "Leaderboard", kind: "link", href: "/leaderboard", icon: Medal },
  { id: "library", label: "Library", kind: "link", href: "/dashboard", icon: Library },
  { id: "rooms", label: "Rooms", kind: "link", href: "/rooms", icon: Video },
  { id: "focus", label: "Focus", kind: "link", href: "/dashboard#focus", icon: Focus },
  { id: "theme", label: "Theme", kind: "theme", icon: SunMoon },
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

  const size = useSpring(
    useTransform(distance, [-140, 0, 140], [46, 58, 46]),
    { stiffness: 320, damping: 24, mass: 0.35 },
  );

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

function DockWithTheme({ mouseX }: { mouseX: ReturnType<typeof useMotionValue<number>> }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { play } = useSound();

  const onAction = (item: DockItem) => {
    if (item.kind === "theme") {
      play(theme === "dark" ? "toggleOff" : "toggleOn");
      toggleTheme();
      return;
    }
    play("tap");
    router.push(item.href);
  };

  return (
    <>
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
