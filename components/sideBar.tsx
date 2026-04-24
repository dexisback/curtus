"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckSquare,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Trophy,
  UserCircle,
  Video,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Rooms", href: "/rooms", icon: Video },
  { label: "Todo", href: "/dashboard/todo", icon: CheckSquare },
  { label: "Profile", href: "/profile", icon: UserCircle },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

const EASE_OUT = [0, 0, 0.58, 1] as const;
const EASE_IN = [0.42, 0, 1, 1] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.032, delayChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10, filter: "blur(3px)" },
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

// ─── Create Room modal ─────────────────────────────────────────────────────

function CreateRoomModal({ onExited }: { onExited: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const requestClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
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
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isPublic }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create room."); return; }
      requestClose();
      router.push(`/room/${data.code}`);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={onExited}>
      {open && (
        <motion.div
          key="create-room-overlay"
          className="fixed inset-0 z-[210] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18, ease: EASE_IN } }}
          onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}
        >
          <div
            className="absolute inset-0 bg-background/25"
            style={{
              backdropFilter: "blur(8px) saturate(1.1)",
              WebkitBackdropFilter: "blur(8px) saturate(1.1)",
            }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-sm"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.18, ease: EASE_IN } }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="panel-texture rounded-2xl border border-border/60 p-5
                shadow-[0_1px_2px_rgba(17,24,39,0.06),0_16px_40px_rgba(17,24,39,0.12),inset_0_1px_0_rgba(255,255,255,0.45)]
                dark:border-border/50 dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_20px_48px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 id={titleId} className="text-sm font-semibold text-foreground">
                  Create a room
                </h2>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  aria-label="Close"
                  onClick={requestClose}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground
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
                  <span className="text-[11.5px] text-foreground/80">Public room</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPublic}
                    onClick={() => setIsPublic((v) => !v)}
                    className="relative h-5 w-9 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/50"
                    style={{ background: isPublic ? "var(--color-cta)" : "oklch(0.82 0.005 75)" }}
                  >
                    <motion.span
                      className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
                      animate={{ left: isPublic ? "calc(100% - 1.125rem)" : "0.125rem" }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
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
                    className="flex-1 rounded-lg bg-cta py-2 text-[11.5px] font-medium text-cta-foreground
                      shadow-[0_1px_3px_rgba(17,24,39,0.1),inset_0_1px_0_rgba(255,255,255,0.12)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-opacity duration-150"
                  >
                    {busy ? "Creating…" : "Create room"}
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

// ─── Sidebar ───────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [createMounted, setCreateMounted] = useState(false);
  const pathname = usePathname();

  const openCreate = useCallback(() => {
    setCreateMounted(true);
  }, []);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <>
      <motion.aside
        initial={isOpen ? { width: "13rem" } : { width: "3.5rem" }}
        animate={{ width: isOpen ? "13rem" : "3.5rem" }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="relative flex h-full shrink-0 flex-col overflow-hidden border-r border-border/40"
      >
        <motion.button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          whileTap={{ scale: 0.96 }}
          className="m-0.5 flex h-[3.5rem] w-[3.5rem] shrink-0 cursor-pointer items-center justify-center
            rounded-lg transition-colors duration-150 hover:bg-accent/60"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.span
                key="close"
                className="flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)", transition: { duration: 0.15, ease: EASE_IN } }}
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              >
                <X size={16} strokeWidth={1.5} />
              </motion.span>
            ) : (
              <motion.span
                key="menu"
                className="flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)", transition: { duration: 0.15, ease: EASE_IN } }}
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              >
                <Menu size={16} strokeWidth={1.5} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={containerVariants}
              className="flex flex-1 flex-col overflow-hidden px-2.5 pb-4"
            >
              {/* Greeting */}
              <motion.p
                variants={itemVariants}
                exit={itemExit}
                className="mb-4 px-1.5 text-[12px] font-medium text-foreground/60"
              >
                hi, amaan
              </motion.p>

              {/* Nav links */}
              <div className="flex flex-1 flex-col gap-0.5">
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
                        className={
                          "flex items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg px-2.5 py-[7.5px] " +
                          "text-[11.5px] font-medium transition-[background-color,color] duration-150 " +
                          (active
                            ? "bg-accent text-foreground"
                            : "text-foreground/70 hover:bg-accent/60 hover:text-foreground")
                        }
                      >
                        <item.icon
                          size={15}
                          strokeWidth={1.6}
                          className={active ? "opacity-80 shrink-0" : "opacity-55 shrink-0"}
                        />
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Create button */}
              <motion.button
                type="button"
                variants={itemVariants}
                exit={itemExit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={openCreate}
                className="mt-3 flex items-center justify-center gap-2 rounded-full bg-cta
                  px-4 py-2 text-[11.5px] font-medium text-cta-foreground
                  shadow-[0_1px_3px_rgba(17,24,39,0.1),inset_0_1px_0_rgba(255,255,255,0.12)]
                  transition-shadow duration-150 whitespace-nowrap cursor-pointer"
              >
                <Plus size={13} strokeWidth={2} />
                Create New
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {createMounted && (
        <CreateRoomModal
          onExited={() => setCreateMounted(false)}
        />
      )}
    </>
  );
}
