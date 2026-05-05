export type WhiteNoiseToneId = "paris-cafe" | "beach" | "river";

export type AmbientSound = {
  id: string;
  label: string;
  fileName: string;
  tone?: WhiteNoiseToneId;
  featured?: boolean;
};

export const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: "beach-pro",
    label: "Beach",
    fileName: "dragon-studio-soothing-ocean-waves-372489.mp3",
    tone: "beach",
    featured: true,
  },
  {
    id: "paris-cafe-pro",
    label: "Paris Cafe",
    fileName: "freesound_community-nyc-chinatown-park-bench-52708.mp3",
    tone: "paris-cafe",
    featured: true,
  },
  {
    id: "river-pro",
    label: "River",
    fileName: "soundreality-big-river-392040.mp3",
    tone: "river",
    featured: true,
  },
  { id: "fire-ambience", label: "Fire Ambience", fileName: "soundreality-fire-ambience-528618.mp3" },
  { id: "seaside-soft", label: "Seaside Soft Waves", fileName: "freesound_community-seaside-soft-waves-24405.mp3" },
  { id: "nyc-siren", label: "NYC Siren", fileName: "freesound_community-siren-in-nyc-27650.mp3" },
  {
    id: "railway-station",
    label: "Railway Station",
    fileName: "arunangshubanerjee-indian-railway-station-ambience-crowd-chatter-and-train-arrival-331012.mp3",
  },
  {
    id: "train-fields",
    label: "Train Through Fields",
    fileName: "arunangshubanerjee-indian-train-accelerating-through-fields-child-cries-then-calms-336663.mp3",
  },
  { id: "mumbai-rickshaw", label: "Mumbai Rickshaw", fileName: "freesound_community-inside-an-auto-rickshaw-in-mumbai-50615.mp3" },
  {
    id: "f1-istanbul",
    label: "F1 Istanbul Onboard",
    fileName: "F1 2006 Alonso vs  Michael Schumacher Onboard Istanbul Park.mp3",
  },
];

export const FEATURED_AMBIENT = AMBIENT_SOUNDS.filter((s) => s.featured);
export const DEVELOPER_LIKES_AMBIENT = AMBIENT_SOUNDS.filter((s) => !s.featured);

const toneFiles: Partial<Record<WhiteNoiseToneId, string>> = {};
for (const s of FEATURED_AMBIENT) {
  if (s.tone) toneFiles[s.tone] = s.fileName;
}
export const TONE_SOUND_FILE = toneFiles as Record<WhiteNoiseToneId, string>;

function normalizedSoundsBaseUrl() {
  const fromEnv = (process.env.NEXT_PUBLIC_SOUNDS_BASE_URL ?? "").trim();
  const base = fromEnv.length > 0 ? fromEnv : "/sounds";
  return base.replace(/\/+$/, "");
}

export function ambientUrl(fileName: string) {
  return `${normalizedSoundsBaseUrl()}/${encodeURIComponent(fileName)}`;
}

// — Ambient sound catalog for white-noise controls and library sound section.
