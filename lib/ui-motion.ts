/**
 * Shared Motion / Framer presets — short durations (≤300ms), ease-out entrances,
 * ease-in exits, springs with no bounce for UI chrome (see make-interfaces-feel-better).
 */

/** State changes, hovers — cubic-bezier(0.2, 0, 0, 1) */
export const EASE_OUT_SMOOTH = [0.2, 0, 0, 1] as const;

/** Entrances / reveals — ease-out */
export const EASE_OUT = [0, 0, 0.58, 1] as const;

/** Exits — ease-in (slightly softer leave) */
export const EASE_IN = [0.42, 0, 1, 1] as const;

export const DURATION = {
  /** Micro-interactions: hover ring, icon swap */
  fast: 0.18,
  /** Panels, dropdowns, rows */
  medium: 0.22,
  /** Modals, larger surfaces */
  slow: 0.28,
} as const;

/** Icon cross-fade / small UI spring — bounce must stay 0 */
export const SPRING_SNAP = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.55,
};

/** Draggable dashboard panels — balanced, low oscillation */
export const SPRING_DRAG_RELEASE = {
  bounceStiffness: 520,
  bounceDamping: 38,
};

/** Subtle lift on hover for textured panels */
export const SPRING_HOVER = {
  type: "spring" as const,
  stiffness: 380,
  damping: 32,
  mass: 0.58,
};

export const TAP_SCALE = 0.96;
