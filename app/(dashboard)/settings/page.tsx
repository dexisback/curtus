import ThemeToggle from "@/components/theme-toggle";
import { Bell, Settings, User } from "lucide-react";

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/50 pb-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50">
        <Icon size={14} strokeWidth={1.6} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-[12.5px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function PlaceholderToggle({ defaultOn = false }: { defaultOn?: boolean }) {
  return (
    <div
      className="relative h-5 w-9 cursor-not-allowed rounded-full"
      style={{
        background: defaultOn ? "var(--color-cta, oklch(0.55 0.12 250))" : "oklch(0.82 0.005 75)",
        opacity: 0.6,
      }}
      aria-disabled="true"
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
        style={{ left: defaultOn ? "calc(100% - 1.125rem)" : "0.125rem" }}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-5 pt-2">
        {/* Page title */}
        <div className="flex items-center gap-2 pt-1">
          <Settings size={14} strokeWidth={1.6} className="text-muted-foreground opacity-70" />
          <h1 className="text-[14px] font-semibold tracking-tight text-foreground">Settings</h1>
        </div>

        {/* ── Account ── */}
        <div
          className="panel-texture rounded-2xl border border-border/50 p-5
            shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07),inset_0_1px_0_rgba(255,255,255,0.5)]"
        >
          <SectionHeader
            icon={User}
            title="Account"
            description="Manage your profile and account details"
          />
          <div className="divide-y divide-border/40">
            <SettingRow
              label="Display name"
              description="How your name appears to other users"
              control={
                <span className="rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-[11.5px] text-muted-foreground">
                  Coming soon
                </span>
              }
            />
            <SettingRow
              label="Email address"
              description="Your login email"
              control={
                <span className="rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-[11.5px] text-muted-foreground">
                  Coming soon
                </span>
              }
            />
            <SettingRow
              label="Avatar"
              description="Upload a profile picture"
              control={
                <span className="rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-[11.5px] text-muted-foreground">
                  Coming soon
                </span>
              }
            />
          </div>
        </div>

        {/* ── Appearance ── */}
        <div
          className="panel-texture rounded-2xl border border-border/50 p-5
            shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07),inset_0_1px_0_rgba(255,255,255,0.5)]"
        >
          <SectionHeader
            icon={Settings}
            title="Appearance"
            description="Customise how the interface looks"
          />
          <div className="divide-y divide-border/40">
            <SettingRow
              label="Theme"
              description="Toggle between light and dark mode"
              control={
                <ThemeToggle className="border-0 bg-transparent shadow-none [box-shadow:none] hover:bg-muted/50" />
              }
            />
            <SettingRow
              label="Compact sidebar"
              description="Start with the sidebar collapsed"
              control={<PlaceholderToggle />}
            />
            <SettingRow
              label="Reduced motion"
              description="Disable decorative animations"
              control={<PlaceholderToggle />}
            />
          </div>
        </div>

        {/* ── Notifications ── */}
        <div
          className="panel-texture rounded-2xl border border-border/50 p-5
            shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07),inset_0_1px_0_rgba(255,255,255,0.5)]"
        >
          <SectionHeader
            icon={Bell}
            title="Notifications"
            description="Control what pings you"
          />
          <div className="divide-y divide-border/40">
            <SettingRow
              label="Session reminders"
              description="Get reminded to start your daily session"
              control={<PlaceholderToggle defaultOn />}
            />
            <SettingRow
              label="Friend activity"
              description="When friends start or finish a session"
              control={<PlaceholderToggle />}
            />
            <SettingRow
              label="Room invites"
              description="Pings when you're invited to a room"
              control={<PlaceholderToggle defaultOn />}
            />
            <SettingRow
              label="Leaderboard updates"
              description="Weekly digest of your rank changes"
              control={<PlaceholderToggle />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
