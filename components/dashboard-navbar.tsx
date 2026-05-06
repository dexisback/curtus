'use client';

import { Menu } from 'lucide-react';
import { motion } from 'motion/react';
import { useMobileNav } from '@/components/mobile-nav-context';
import SoundToggle from '@/components/sound-toggle';
import ThemeToggle from '@/components/theme-toggle';
import ProfileDropdown from '@/components/profileDropdown';

type UserLite = {
  name?: string | null;
  image?: string | null;
  email?: string | null;
};

export default function DashboardNavbar({ user }: { user: UserLite }) {
  const { openMobileNav, toggleMobileNav, mobileNavOpen } = useMobileNav();

  return (
    <header className="relative z-[138] flex w-full shrink-0 items-center justify-between gap-2 px-3 pb-0 pt-1 sm:px-4 sm:pt-2 lg:z-50 lg:justify-end lg:gap-0">
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => (mobileNavOpen ? toggleMobileNav() : openMobileNav())}
        className="-ml-0.5 flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-border/50 bg-card/92 text-foreground/80 shadow-float backdrop-blur-md transition-colors hover:bg-muted/55 lg:hidden"
        aria-expanded={mobileNavOpen}
        aria-controls="dashboard-sidebar"
        aria-label={
          mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'
        }
      >
        <Menu size={18} strokeWidth={1.7} />
      </motion.button>

      <motion.nav
        initial={false}
        id="dashboard-top-nav-controls"
        className="shadow-float relative z-[138] ml-auto flex w-fit max-w-[min(100%,20rem)] items-center gap-0.5 rounded-2xl border border-border/50 bg-card/92 py-1 pl-1 pr-1 backdrop-blur-md
          lg:ml-0"
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
