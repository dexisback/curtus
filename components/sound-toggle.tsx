'use client';

import { motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '@/components/sound-provider';

export default function SoundToggle({ className }: { className?: string }) {
  const { enabled, setEnabled, play } = useSound();

  const onToggle = () => {
    const next = !enabled;
    setEnabled(next);
    play(next ? 'toggleOn' : 'toggleOff', { force: true });
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onToggle}
      className={
        'relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ' +
        'border border-border/50 bg-card/80 text-foreground/85 shadow-sm ' +
        'hover:bg-accent/60 hover:text-foreground ' +
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60 ' +
        (className ?? '')
      }
      aria-label={enabled ? 'Mute interface sounds' : 'Enable interface sounds'}
      aria-pressed={enabled}
    >
      {enabled ? (
        <Volume2 size={15} strokeWidth={1.7} className="text-foreground/90" />
      ) : (
        <VolumeX size={15} strokeWidth={1.7} className="text-foreground/90" />
      )}
    </motion.button>
  );
}

// — Mute/unmute UI sounds; persists via settings.
