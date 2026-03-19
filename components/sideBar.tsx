"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu,
  X,
  Plus,
  LayoutDashboard,
  Library,
  Clock,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Library", icon: Library },
  { label: "History", icon: Clock },
  { label: "Settings", icon: Settings },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.035, delayChildren: 0.04 },
  },
};

const EASE_OUT = [0, 0, 0.58, 1] as const;
const EASE_IN = [0.42, 0, 1, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, x: -12, filter: "blur(3px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.22, ease: EASE_OUT },
  },
};

const itemExit = {
  opacity: 0,
  x: -8,
  filter: "blur(3px)",
  transition: { duration: 0.15, ease: EASE_IN },
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <motion.aside
      initial={isOpen ? { width: "13rem" } : { width: "3.5rem" }}
      animate={{ width: isOpen ? "13rem" : "3.5rem" }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="relative flex flex-col h-full shrink-0 border-r border-border/40 overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-[3.5rem] h-[3.5rem] flex items-center justify-center shrink-0 cursor-pointer
          hover:bg-accent/60 active:scale-95 rounded-lg m-0.5 transition-colors duration-150"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.58, 1] }}
            >
              <X size={17} strokeWidth={1.5} />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.58, 1] }}
            >
              <Menu size={17} strokeWidth={1.5} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={containerVariants}
            className="flex flex-col flex-1 px-2.5 pb-4 overflow-hidden"
          >
            <motion.p
              variants={itemVariants}
              exit={itemExit}
              className="text-[11px] tracking-tight mb-4 px-1.5 text-muted-foreground/70"
            >
              hi, amaan
            </motion.p>

            <div className="flex flex-col gap-0.5 flex-1">
              {navItems.map((item) => (
                <motion.button
                  key={item.label}
                  variants={itemVariants}
                  exit={itemExit}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {}}
                  className="flex items-center gap-2.5 text-left px-2.5 py-[7px] rounded-lg text-xs
                    text-foreground/80 hover:text-foreground hover:bg-accent/70
                    active:bg-accent transition-colors duration-150 cursor-pointer
                    whitespace-nowrap overflow-hidden"
                >
                  <item.icon size={14} strokeWidth={1.6} className="shrink-0 opacity-50" />
                  {item.label}
                </motion.button>
              ))}
            </div>

            <motion.button
              variants={itemVariants}
              exit={itemExit}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {}}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-full
                bg-cta text-cta-foreground text-xs font-medium cursor-pointer
                transition-shadow duration-150 whitespace-nowrap
                shadow-[0_1px_3px_rgba(17,24,39,0.1),inset_0_1px_0_rgba(255,255,255,0.12)]"
            >
              <Plus size={14} strokeWidth={2} />
              Create New
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
