"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { User, UserCircle, SlidersHorizontal, HelpCircle, LogOut } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSignOut() {
    setIsOpen(false);
    await signOut({
      fetchOptions: {
        onSuccess: () => router.replace("/login"),
      },
    });
  }

  const avatarUrl = session?.user?.image;

  const menuItems = [
    { label: "Profile", icon: UserCircle, onClick: () => {} },
    { label: "Preferences", icon: SlidersHorizontal, onClick: () => {} },
    { label: "Help", icon: HelpCircle, onClick: () => {} },
    { label: "Sign Out", icon: LogOut, onClick: handleSignOut },
  ];

  return (
    <div ref={ref} className="relative z-50">
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        whileTap={{ scale: 0.92 }}
        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center
          hover:bg-accent transition-colors duration-150 cursor-pointer
          border border-border/40 shadow-[0_1px_2px_rgba(17,24,39,0.04)] overflow-hidden"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <User size={14} strokeWidth={1.5} />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: -4,
              scale: 0.97,
              transition: { duration: 0.15, ease: [0.42, 0, 1, 1] },
            }}
            transition={{ duration: 0.2, ease: [0, 0, 0.58, 1] }}
            className="absolute right-0 mt-1.5 w-[168px] rounded-xl bg-popover border border-border/60
              shadow-[0_1px_2px_rgba(17,24,39,0.05),0_4px_12px_rgba(17,24,39,0.06),0_12px_28px_rgba(17,24,39,0.05)]
              p-1"
          >
            {menuItems.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.18,
                  ease: [0, 0, 0.58, 1],
                  delay: i * 0.03,
                }}
                whileTap={{ scale: 0.97 }}
                onClick={item.onClick}
                className="w-full flex items-center gap-2.5 text-left px-2.5 py-[6px] text-xs rounded-lg
                  text-foreground/80 hover:text-foreground hover:bg-accent/70
                  active:bg-accent transition-colors duration-150 cursor-pointer"
              >
                <item.icon size={13} strokeWidth={1.5} className="opacity-45" />
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
