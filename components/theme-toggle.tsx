"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useSound } from "@/components/sound-provider";
import { useTheme } from "@/components/theme-provider";

const EASE_IN: readonly [number, number, number, number] = [0.42, 0, 1, 1];

type Props = {
  className?: string;
  "aria-label"?: string;
};

export default function ThemeToggle({ className, "aria-label": ariaLabel }: Props) {
  const { theme, toggleTheme, mounted } = useTheme();
  const { play } = useSound();
  const isDark = theme === "dark";
  const [reduced, setReduced] = useState(false);

  const onToggle = () => {
    play(isDark ? "toggleOff" : "toggleOn");
    toggleTheme();
  };
  useEffect(() => {
    setReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  if (!mounted) {
    return (
      <div
        className={`h-8 w-8 shrink-0 rounded-full border border-border/50 bg-card/50 ${className ?? ""}`}
        aria-hidden
      />
    );
  }

  if (reduced) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 " +
          "bg-card/80 text-foreground/85 shadow-sm hover:bg-accent/60 hover:text-foreground " +
          (className ?? "")
        }
        aria-label={ariaLabel ?? (isDark ? "Light mode" : "Dark mode")}
      >
        {isDark ? (
          <Moon size={15} strokeWidth={1.7} />
        ) : (
          <Sun size={15} strokeWidth={1.7} />
        )}
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.96 }}
      className={
        "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full " +
        "border border-border/50 bg-card/80 text-foreground/85 shadow-sm " +
        "hover:bg-accent/60 hover:text-foreground " +
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60 " +
        (className ?? "")
      }
      aria-label={ariaLabel ?? (isDark ? "Light mode" : "Dark mode")}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            className="absolute flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              scale: 0.25,
              filter: "blur(4px)",
              transition: { duration: 0.16, ease: EASE_IN },
            }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          >
            <Moon size={15} strokeWidth={1.7} className="text-foreground/90" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            className="absolute flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              scale: 0.25,
              filter: "blur(4px)",
              transition: { duration: 0.16, ease: EASE_IN },
            }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          >
            <Sun size={15} strokeWidth={1.7} className="text-foreground/90" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// — theme-toggle.tsx: Light/dark toggle via theme provider; respects reduced motion (simple button vs motion).

