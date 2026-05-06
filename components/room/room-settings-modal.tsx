'use client';

import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Copy, Settings, Trash2, X } from 'lucide-react';
import { useSound } from '@/components/sound-provider';

type Props = {
  open: boolean;
  onClose: () => void;
  roomName: string;
  roomCode: string;
  onDeleteRoom: () => void | Promise<void>;
  deleteBusy: boolean;
};

export default function RoomSettingsModal({
  open,
  onClose,
  roomName,
  roomCode,
  onDeleteRoom,
  deleteBusy,
}: Props) {
  const { play } = useSound();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const copyCode = useCallback(() => {
    void navigator.clipboard.writeText(roomCode).then(() => play('tap'));
  }, [play, roomCode]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDeleteRoom();
  }, [confirmDelete, onDeleteRoom]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="room-settings"
          className="fixed inset-0 z-[130] flex max-h-[100dvh] items-end justify-center overflow-y-auto overflow-x-hidden p-4 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0, 0, 0.58, 1] }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              play('modalClose');
              setConfirmDelete(false);
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/45 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-settings-title"
            initial={{ y: 10, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.985 }}
            transition={{ type: 'spring', duration: 0.28, bounce: 0 }}
            className="shadow-float relative z-10 my-auto w-full max-w-md overflow-hidden rounded-2xl border border-border/40 bg-card/96 ring-1 ring-inset ring-black/[0.035] sm:my-0 dark:border-border/50 dark:bg-card/94 dark:ring-white/[0.06]
              dark:shadow-[0_2px_6px_rgb(0_0_0/0.28),0_24px_56px_rgb(0_0_0/0.34),inset_0_1px_0_rgb(255_255_255/0.05)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
                  <Settings size={18} strokeWidth={1.6} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2
                    id="room-settings-title"
                    className="text-[14px] font-semibold tracking-tight text-foreground"
                  >
                    Room settings
                  </h2>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {roomName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  play('modalClose');
                  setConfirmDelete(false);
                  onClose();
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
                aria-label="Close"
              >
                <X size={16} strokeWidth={1.7} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Room code
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 font-mono text-[13px] font-medium tabular-nums text-foreground">
                    {roomCode}
                  </code>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-accent/60"
                  >
                    <Copy size={13} strokeWidth={1.7} />
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 bg-muted/15 px-5 py-4">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-destructive/90">
                Danger zone
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Permanently delete this room and remove all members. This cannot
                be undone.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                {confirmDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="order-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent/60 sm:order-1"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => void handleDelete()}
                  className={
                    'order-1 inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[11.5px] font-medium transition-[transform,opacity] duration-150 sm:order-2 ' +
                    (confirmDelete
                      ? 'bg-destructive text-destructive-foreground shadow-[0_1px_3px_rgba(127,29,29,0.25)] hover:bg-destructive/90 active:scale-[0.98] disabled:opacity-50'
                      : 'border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 active:scale-[0.98] disabled:opacity-50')
                  }
                >
                  <Trash2 size={14} strokeWidth={1.7} />
                  {confirmDelete
                    ? deleteBusy
                      ? 'Deleting…'
                      : 'Confirm delete room'
                    : 'Delete room'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
