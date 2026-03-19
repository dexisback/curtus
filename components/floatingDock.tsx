"use client";

import { useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import {
  Camera,
  Clock,
  LayoutDashboard,
  Library,
  NotebookPen,
  Sparkles,
  SunMoon,
} from "lucide-react";

type DockItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

const DOCK_ITEMS: DockItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "library", label: "Library", icon: Library },
  { id: "history", label: "History", icon: Clock },
  { id: "capture", label: "Capture", icon: Camera },
  { id: "note", label: "Add Note", icon: NotebookPen },
  { id: "ask", label: "Ask AI", icon: Sparkles },
  { id: "theme", label: "Theme", icon: SunMoon },
];

function DockIcon({
  item,
  mouseX,
}: {
  item: DockItem;
  mouseX: ReturnType<typeof useMotionValue<number>>;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const distance = useTransform(mouseX, (x) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 140;
    return x - (rect.left + rect.width / 2);
  });

  const size = useSpring(
    useTransform(distance, [-140, 0, 140], [46, 58, 46]),
    { stiffness: 320, damping: 24, mass: 0.35 }
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
      whileTap={{ scale: 0.94 }}
      className="group relative flex items-center justify-center rounded-2xl border border-border/70
        bg-card/88 text-foreground/75 shadow-[0_1px_2px_rgba(17,24,39,0.06),0_7px_16px_rgba(17,24,39,0.08),inset_0_1px_0_rgba(255,255,255,0.45)]
        backdrop-blur-md transition-colors duration-150 hover:text-foreground"
      aria-label={item.label}
      onClick={() => {}}
    >
      <span
        className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md border border-border/60
          bg-popover/95 px-2 py-1 text-[11px] leading-none text-foreground/85 opacity-0
          shadow-[0_1px_2px_rgba(17,24,39,0.08)] backdrop-blur-sm transition-all duration-150
          group-hover:-translate-y-0.5 group-hover:opacity-100"
      >
        {item.label}
      </span>
      <Icon size={18} strokeWidth={1.7} className="opacity-85" />
    </motion.button>
  );
}

export default function FloatingDock() {
  const mouseX = useMotionValue<number>(Infinity);
  const items = useMemo(() => DOCK_ITEMS, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.24, ease: [0, 0, 0.58, 1] }}
      onMouseMove={(event) => mouseX.set(event.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="pointer-events-auto"
    >
      <div
        className="panel-texture flex h-[72px] items-end gap-2 rounded-3xl border border-border/60 px-3 pb-2.5 pt-2
          shadow-[0_1px_2px_rgba(17,24,39,0.04),0_10px_24px_rgba(17,24,39,0.12),inset_0_1px_0_rgba(255,255,255,0.5)]"
      >
        {items.map((item) => (
          <DockIcon key={item.id} item={item} mouseX={mouseX} />
        ))}
      </div>
    </motion.div>
  );
}
