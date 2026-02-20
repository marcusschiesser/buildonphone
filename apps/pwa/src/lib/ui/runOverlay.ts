export const RUN_OVERLAY_FADE_DELAY_MS = 2500;

export const RUN_OVERLAY_ACTIVITY_EVENTS = ['pointerdown', 'touchstart', 'scroll', 'keydown'] as const;

export function getRunOverlayOpacityClass(visible: boolean): string {
  return visible ? 'opacity-100' : 'opacity-35';
}

export function getRunOverlayPositionStyle(offsetPx = 12): { top: string; left: string } {
  return {
    top: `max(${offsetPx}px, env(safe-area-inset-top))`,
    left: `max(${offsetPx}px, env(safe-area-inset-left))`,
  };
}
