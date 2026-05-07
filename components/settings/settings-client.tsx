'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import ThemeToggle from '@/components/theme-toggle';
import { Bell, Pencil, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SerializedUserSettings } from '@/lib/user-settings';
import AvatarCropModal, {
  MAX_AVATAR_SOURCE_BYTES,
} from '@/components/profile/avatar-crop-modal';

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
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
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {description}
          </p>
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
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="text-[12.5px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 rounded-full transition-colors duration-200 disabled:opacity-60"
      style={{
        background: checked ? 'var(--color-cta)' : 'oklch(0.82 0.005 75)',
      }}
    >
      <motion.span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
        animate={{ left: checked ? 'calc(100% - 1.375rem)' : '0.125rem' }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      />
    </button>
  );
}

export default function SettingsClient({
  initialName,
  initialEmail,
  initialImage,
  initialSettings,
}: {
  initialName: string;
  initialEmail: string;
  initialImage: string | null;
  initialSettings: SerializedUserSettings;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [image, setImage] = useState(initialImage ?? '');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [pickedFileName, setPickedFileName] = useState('');
  const [editingAccount, setEditingAccount] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [pendingCropName, setPendingCropName] = useState('');
  const cropBlobUrlRef = useRef<string | null>(null);

  const [compactSidebar, setCompactSidebar] = useState(
    initialSettings.compactSidebar,
  );
  const [leaderboardUpdates, setLeaderboardUpdates] = useState(
    initialSettings.leaderboardUpdates,
  );
  const [sessionReminders, setSessionReminders] = useState(
    initialSettings.sessionReminders,
  );
  const [friendActivity, setFriendActivity] = useState(
    initialSettings.friendActivity,
  );
  const [roomInvites, setRoomInvites] = useState(initialSettings.roomInvites);
  const [showMotionMessage, setShowMotionMessage] = useState(false);

  function revokeCropBlob() {
    const u = cropBlobUrlRef.current;
    if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
    cropBlobUrlRef.current = null;
  }

  useEffect(() => {
    return () => {
      const u = cropBlobUrlRef.current;
      if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
      cropBlobUrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'swm:compact-sidebar',
        initialSettings.compactSidebar ? '1' : '0',
      );
      localStorage.setItem(
        'swm:leaderboard-updates',
        initialSettings.leaderboardUpdates ? '1' : '0',
      );
      localStorage.setItem(
        'swm:session-reminders',
        initialSettings.sessionReminders ? '1' : '0',
      );
      localStorage.setItem(
        'swm:friend-activity',
        initialSettings.friendActivity ? '1' : '0',
      );
      localStorage.setItem(
        'swm:room-invites',
        initialSettings.roomInvites ? '1' : '0',
      );
    } catch {}
  }, [initialSettings]);

  function persistFlag(
    key: string,
    settingKey: keyof SerializedUserSettings,
    next: boolean,
  ) {
    try {
      localStorage.setItem(key, next ? '1' : '0');
    } catch {}
    void fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [settingKey]: next }),
    }).catch(() => {});
  }

  async function onAvatarPicked(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSaveError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_SOURCE_BYTES) {
      setSaveError('Image is too large. Please use a file under 15MB.');
      return;
    }
    revokeCropBlob();
    const url = URL.createObjectURL(file);
    cropBlobUrlRef.current = url;
    setCropImageSrc(url);
    setPendingCropName(file.name);
    setCropOpen(true);
    setSaveError(null);
  }

  function closeCropModal() {
    revokeCropBlob();
    setCropImageSrc(null);
    setCropOpen(false);
  }

  function applyCroppedAvatar(dataUrl: string, fileName: string) {
    revokeCropBlob();
    setCropImageSrc(null);
    setCropOpen(false);
    setImage(dataUrl);
    setPickedFileName(fileName);
  }

  async function saveAccount() {
    if (saveBusy) return;
    setSaveBusy(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          image: image || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveError(data.error ?? 'Failed to save account settings.');
        return;
      }
      setSaveSuccess('Saved.');
      router.refresh();
    } catch {
      setSaveError('Something went wrong while saving.');
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-5 pt-2">
        <div className="flex items-center gap-2 pt-1">
          <Settings
            size={14}
            strokeWidth={1.6}
            className="text-muted-foreground opacity-70"
          />
          <h1 className="text-[14px] font-semibold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        <div
          className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:340px_340px] rounded-2xl border border-border/50 p-5
          shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07),inset_0_1px_0_rgba(255,255,255,0.5)]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50">
                <User
                  size={14}
                  strokeWidth={1.6}
                  className="text-muted-foreground"
                />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  Account
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Manage your profile and account details
                </p>
              </div>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setEditingAccount((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-border/70 bg-background text-muted-foreground transition-colors hover:text-foreground"
              aria-label={
                editingAccount ? 'Close account editing' : 'Edit account'
              }
            >
              <Pencil size={14} />
            </motion.button>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {editingAccount ? (
              <motion.div
                key="account-edit"
                initial={{ opacity: 0, x: 28, filter: 'blur(2px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -14, filter: 'blur(2px)' }}
                transition={{ type: 'spring', duration: 0.28, bounce: 0 }}
                className="will-change-[transform,opacity,filter]"
              >
                <div className="divide-y divide-border/40">
                  <SettingRow
                    label="Display name"
                    description="How your name appears to other users"
                    control={
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-52 rounded-md border border-border/70 bg-background px-3 py-1.5 text-[11.5px] text-foreground"
                      />
                    }
                  />
                  <SettingRow
                    label="Email address"
                    description="Your login email (saved directly; verification flow not added yet)"
                    control={
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-56 rounded-md border border-border/70 bg-background px-3 py-1.5 text-[11.5px] text-foreground"
                      />
                    }
                  />
                  <SettingRow
                    label="Avatar"
                    description="Upload a profile picture from your computer"
                    control={
                      <div className="flex items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-[6px] border border-border/70 bg-background px-3 py-1.5 text-[11.5px] text-foreground">
                          Choose file
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              void onAvatarPicked(e.target.files?.[0] ?? null)
                            }
                          />
                        </label>
                        <span className="max-w-24 truncate text-[10px] text-muted-foreground">
                          {pickedFileName || (image ? 'Selected' : 'No file')}
                        </span>
                      </div>
                    }
                  />
                </div>
                {(saveError || saveSuccess) && (
                  <p
                    className={
                      'mt-3 text-[11px] ' +
                      (saveError ? 'text-destructive' : 'text-muted-foreground')
                    }
                  >
                    {saveError ?? saveSuccess}
                  </p>
                )}
                <div className="mt-3 flex justify-end">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    disabled={saveBusy || !name.trim() || !email.trim()}
                    onClick={() => void saveAccount()}
                    className="app-cta-surface rounded-[6px] px-3 py-1.5 text-[11px] font-medium text-cta-foreground disabled:opacity-60"
                  >
                    {saveBusy ? 'Saving...' : 'Save account'}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="account-read"
                initial={{ opacity: 0, x: 28, filter: 'blur(2px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -14, filter: 'blur(2px)' }}
                transition={{ type: 'spring', duration: 0.28, bounce: 0 }}
                className="divide-y divide-border/40 will-change-[transform,opacity,filter]"
              >
                <SettingRow
                  label="Display name"
                  description="How your name appears to other users"
                  control={
                    <span className="text-[12px] text-foreground/90">
                      {name || '-'}
                    </span>
                  }
                />
                <SettingRow
                  label="Email address"
                  description="Your login email"
                  control={
                    <span className="text-[12px] text-foreground/90">
                      {email || '-'}
                    </span>
                  }
                />
                <SettingRow
                  label="Avatar"
                  description="Upload a profile picture from your computer"
                  control={
                    <span className="text-[11px] text-muted-foreground">
                      {image ? 'Configured' : 'No avatar'}
                    </span>
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:340px_340px] rounded-2xl border border-border/50 p-5
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
              control={
                <Toggle
                  checked={compactSidebar}
                  onChange={(next) => {
                    setCompactSidebar(next);
                    persistFlag('swm:compact-sidebar', 'compactSidebar', next);
                    window.dispatchEvent(
                      new CustomEvent('app:compact-sidebar-changed'),
                    );
                  }}
                />
              }
            />
            <SettingRow
              label="Reduced motion"
              description="Disable decorative animations"
              control={
                <span
                  className="relative inline-flex items-center"
                  onMouseEnter={() => setShowMotionMessage(true)}
                  onMouseLeave={() => setShowMotionMessage(false)}
                >
                  <Toggle checked={false} onChange={() => {}} disabled />
                  {showMotionMessage && (
                    <span className="absolute -top-7 right-0 rounded-md border border-border/70 bg-background px-2 py-1 text-[10px] text-foreground shadow-sm">
                      no. the developer likes motion
                    </span>
                  )}
                </span>
              }
            />
          </div>
        </div>

        <div
          className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:340px_340px] rounded-2xl border border-border/50 p-5
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
              control={
                <Toggle
                  checked={sessionReminders}
                  onChange={(next) => {
                    setSessionReminders(next);
                    persistFlag(
                      'swm:session-reminders',
                      'sessionReminders',
                      next,
                    );
                  }}
                />
              }
            />
            <SettingRow
              label="Friend activity"
              description="When friends start or finish a session"
              control={
                <Toggle
                  checked={friendActivity}
                  onChange={(next) => {
                    setFriendActivity(next);
                    persistFlag('swm:friend-activity', 'friendActivity', next);
                  }}
                />
              }
            />
            <SettingRow
              label="Room invites"
              description="Pings when you're invited to a room"
              control={
                <Toggle
                  checked={roomInvites}
                  onChange={(next) => {
                    setRoomInvites(next);
                    persistFlag('swm:room-invites', 'roomInvites', next);
                  }}
                />
              }
            />
            <SettingRow
              label="Leaderboard updates"
              description="Weekly digest of your rank changes"
              control={
                <Toggle
                  checked={leaderboardUpdates}
                  onChange={(next) => {
                    setLeaderboardUpdates(next);
                    persistFlag(
                      'swm:leaderboard-updates',
                      'leaderboardUpdates',
                      next,
                    );
                  }}
                />
              }
            />
          </div>
        </div>
      </div>

      <AvatarCropModal
        open={cropOpen}
        imageSrc={cropImageSrc}
        suggestedFileName={pendingCropName}
        onClose={closeCropModal}
        onApply={applyCroppedAvatar}
      />
    </div>
  );
}

// — Settings form: profile fields + toggles; PATCH /api/settings.
