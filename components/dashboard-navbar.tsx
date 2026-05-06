'use client';

import { motion } from 'motion/react';
import SoundToggle from '@/components/sound-toggle';
import ThemeToggle from '@/components/theme-toggle';
import ProfileDropdown from '@/components/profileDropdown';

type UserLite = {
  name?: string | null;
  image?: string | null;
  email?: string | null;
};

export default function DashboardNavbar({ user }: { user: UserLite }) {
  return (
    <header className="relative z-50 flex shrink-0 justify-end px-3 pb-0 pt-1 sm:px-4 sm:pt-2">
      <motion.nav
        initial={false}
        className="shadow-float relative z-50 flex w-fit max-w-[min(100%,20rem)] items-center gap-0.5 rounded-2xl border border-border/50
          bg-card/92 py-1 pl-1 pr-1 backdrop-blur-md"
      >
        <SoundToggle className="border-0 bg-transparent shadow-none [box-shadow:none] hover:bg-muted/50" />
        <div className="h-4 w-px bg-border/60" aria-hidden />
        <ThemeToggle className="border-0 bg-transparent shadow-none [box-shadow:none] hover:bg-muted/50" />
        <div className="h-4 w-px bg-border/60" aria-hidden />
        <div className="pl-0.5 pr-0.5">
          <ProfileDropdown user={user} />
        </div>
      </motion.nav>
    </header>
  );
}

// — Top bar for dashboard: title slot, theme, sound, profile menu.
