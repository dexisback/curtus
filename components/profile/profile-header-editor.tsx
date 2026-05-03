"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pencil, X } from "lucide-react";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileHeaderEditor({
  initialName,
  initialEmail,
  initialImage,
  joinedLabel,
}: {
  initialName: string;
  initialEmail: string;
  initialImage: string | null;
  joinedLabel: string;
}) {
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState<string | null>(initialImage);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftName, setDraftName] = useState(initialName);
  const [draftImage, setDraftImage] = useState(initialImage ?? "");
  const [pickedFileName, setPickedFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => getInitials(name || "U"), [name]);

  async function save() {
    if (busy) return;
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      setError("Name cannot be empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: { name: string; image?: string } = { name: trimmedName };
      const trimmedImage = draftImage.trim();
      if (trimmedImage) payload.image = trimmedImage;
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        name?: string;
        image?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to update profile.");
        return;
      }
      setName(data.name ?? trimmedName);
      setImage((data.image ?? trimmedImage) || null);
      setOpen(false);
    } catch {
      setError("Something went wrong while saving.");
    } finally {
      setBusy(false);
    }
  }

  async function onFilePicked(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 1_500_000) {
      setError("Image is too large. Please keep it under 1.5MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
    setDraftImage(dataUrl);
    setPickedFileName(file.name);
    setError(null);
  }

  return (
    <>
      <div
        className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-border/50 p-5
          shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07),inset_0_1px_0_rgba(255,255,255,0.5)]"
      >
        <div className="flex items-center gap-4">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="h-14 w-14 shrink-0 rounded-2xl object-cover [outline:1px_solid_rgba(0,0,0,0.07)]"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-2xl text-sm font-semibold text-white
                [outline:1px_solid_rgba(0,0,0,0.06)]"
              style={{ background: "oklch(0.62 0.06 75)" }}
            >
              {initials}
            </div>
          )}
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">{name}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{initialEmail}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Joined {joinedLabel}</p>
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          whileHover={{ y: -1, scale: 1.01 }}
          onClick={() => {
            setDraftName(name);
            setDraftImage(image ?? "");
            setError(null);
            setOpen(true);
          }}
          className="group relative flex min-h-[5.2rem] min-w-[7.25rem] items-center justify-center rounded-xl px-5 text-muted-foreground hover:text-foreground"
          aria-label="Edit profile"
        >
          <Pencil size={17} className="transition-transform duration-200 group-hover:-rotate-12 group-hover:translate-x-[1px]" />
          <motion.span
            className="pointer-events-none absolute bottom-5 h-[1.5px] w-7 rounded-full bg-current opacity-0"
            initial={false}
            whileHover={{ opacity: 1, scaleX: [0.3, 1] }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          />
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) setOpen(false);
            }}
          >
            <div
              className="absolute inset-0 bg-background/25"
              style={{
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            />
            <motion.div
              initial={{ y: 8, opacity: 0, scale: 0.985 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 8, opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.58, 1] }}
              className="relative z-10 w-full max-w-md rounded-xl border border-border/60 bg-card p-4
                shadow-[0_1px_2px_rgba(17,24,39,0.06),0_18px_40px_rgba(17,24,39,0.12)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-foreground">Edit profile</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-muted"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[10.5px] text-muted-foreground">Name</span>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-[12px] text-foreground"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10.5px] text-muted-foreground">Profile image</span>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-[6px] border border-border/70 bg-background px-3 py-2 text-[11px] font-medium text-foreground">
                      Choose file
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => void onFilePicked(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <span className="truncate text-[10.5px] text-muted-foreground">
                      {pickedFileName || (draftImage ? "Image selected" : "No file chosen")}
                    </span>
                  </div>
                </label>
                {error && <p className="text-[10.5px] text-destructive">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setOpen(false)}
                    disabled={busy}
                    className="rounded-[6px] border border-border/70 bg-background px-3 py-1.5 text-[11px] font-medium text-foreground"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => void save()}
                    disabled={busy || !draftName.trim()}
                    className="rounded-[6px] bg-cta px-3 py-1.5 text-[11px] font-medium text-cta-foreground disabled:opacity-60"
                  >
                    {busy ? "Saving..." : "Save"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// — Edit name, bio, avatar; PATCH /api/profile.
