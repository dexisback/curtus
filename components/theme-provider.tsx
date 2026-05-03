"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
} | null>(null);

const STORAGE = "svm-theme";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyDom(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE, theme);
  } catch {}
  try {
    document.cookie = `${STORAGE}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

function persistTheme(theme: Theme) {
  void fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  }).catch(() => {});
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readInitialTheme());
  const initialThemeRef = useRef(theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    applyDom(initialThemeRef.current);
    queueMicrotask(() => setMounted(true));

    void fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((settings: { theme?: Theme } | null) => {
        if (settings?.theme === "light" || settings?.theme === "dark") {
          setTheme(settings.theme);
          applyDom(settings.theme);
        }
      })
      .catch(() => {});
  }, []);

  const setAndPersist = useCallback((t: Theme) => {
    setTheme(t);
    applyDom(t);
    persistTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyDom(next);
      persistTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setAndPersist,
      toggleTheme,
      mounted,
    }),
    [theme, setAndPersist, toggleTheme, mounted],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

// — Reads theme from settings/localStorage; toggles document class.
