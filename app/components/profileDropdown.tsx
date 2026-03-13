"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "lucide-react";

const dropdownItems = ["Profile", "Preferences", "Help", "Sign Out"];

const itemVariants = {
  hidden: { opacity: 0, y: -4, filter: "blur(2px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center
          hover:bg-accent transition-colors duration-200 cursor-pointer border border-border/50"
      >
        <User size={14} strokeWidth={1.5} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute right-0 mt-2 w-40 rounded-xl bg-popover border border-border
              shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden p-1"
          >
            {dropdownItems.map((item, i) => (
              <motion.button
                key={item}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{
                  duration: 0.25,
                  ease: "easeInOut",
                  delay: i * 0.04,
                }}
                onClick={() => {}}
                className="w-full text-left px-3 py-1.5 text-xs rounded-lg
                  hover:bg-accent transition-colors duration-200 cursor-pointer"
              >
                {item}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
