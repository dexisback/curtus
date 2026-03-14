"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Plus } from "lucide-react";

const navItems = [
  { label: "Dashboard" },
  { label: "Library" },
  { label: "History" },
  { label: "Settings" },
];

const sidebarVariants = {
  closed: { width: "3.5rem" },
  open: { width: "12rem" },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -16, filter: "blur(4px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)" },
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <motion.aside
      variants={sidebarVariants}
      initial={isOpen ? "open" : "closed"}
      animate={isOpen ? "open" : "closed"}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col h-full shrink-0 border-r border-border/50 overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-[3.5rem] h-[3.5rem] flex items-center justify-center shrink-0 cursor-pointer"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <X size={18} strokeWidth={1.5} />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Menu size={18} strokeWidth={1.5} />
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
            className="flex flex-col flex-1 px-3 pb-4 overflow-hidden"
          >
            <motion.p
              variants={itemVariants}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="text-xs tracking-tight mb-5 px-1 text-muted-foreground"
            >
              hi, amaan
            </motion.p>

            <div className="flex flex-col gap-1.5 flex-1">
              {navItems.map((item) => (
                <motion.button
                  key={item.label}
                  variants={itemVariants}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  onClick={() => {}}
                  className="text-left px-3 py-2 rounded-lg text-xs border border-border/60
                    hover:bg-accent transition-colors duration-200 cursor-pointer
                    whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {item.label}
                </motion.button>
              ))}
            </div>

            <motion.button
              variants={itemVariants}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={() => {}}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-full
                bg-cta text-cta-foreground text-xs font-medium cursor-pointer
                hover:opacity-90 transition-opacity duration-200 whitespace-nowrap"
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
