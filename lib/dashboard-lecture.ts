export type DashboardLecture = {
  id: string;
  embedUrl: string;
  url: string;
  label: string;
};

export const DASHBOARD_LECTURE_STORAGE_KEY = "swm:dashboard-lecture";

export function readDashboardLecture(): DashboardLecture | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DASHBOARD_LECTURE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DashboardLecture>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.id || !parsed.embedUrl || !parsed.url || !parsed.label) return null;
    return {
      id: String(parsed.id),
      embedUrl: String(parsed.embedUrl),
      url: String(parsed.url),
      label: String(parsed.label),
    };
  } catch {
    return null;
  }
}

export function writeDashboardLecture(value: DashboardLecture) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DASHBOARD_LECTURE_STORAGE_KEY, JSON.stringify(value));
}

export function clearDashboardLecture() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DASHBOARD_LECTURE_STORAGE_KEY);
}

// — LocalStorage helpers for explicitly selected dashboard lecture state.
