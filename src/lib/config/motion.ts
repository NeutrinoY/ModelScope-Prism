/**
 * Motion tokens (docs/rebuild/09-visual-and-interaction-guidelines.md).
 * Shared by Motion for React components; CSS transitions read the same
 * values from globals.css custom properties.
 */

export const motionDurations = {
  instant: 0.08,
  fast: 0.14,
  base: 0.22,
  slow: 0.32,
} as const;

export const motionEase = {
  standard: [0.22, 1, 0.36, 1],
  exit: [0.4, 0, 1, 1],
  emphasis: [0.16, 1, 0.3, 1],
} as const satisfies Record<string, [number, number, number, number]>;

/** Workspace switch transition (220-300ms, soft slide + fade). */
export const workspaceTransition = {
  initial: { opacity: 0, y: 10, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(10px)' },
  transition: { duration: 0.28, ease: motionEase.standard },
} as const;

/** Generated image entrance (240-320ms scale + opacity). */
export const imageEntrance = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.28, ease: motionEase.emphasis },
} as const;

/** Popover / floating panel entrance. */
export const popEntrance = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.95 },
  transition: { duration: motionDurations.fast, ease: motionEase.standard },
} as const;
