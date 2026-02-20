import { describe, expect, it } from 'vitest';
import {
  getRunOverlayOpacityClass,
  getRunOverlayPositionStyle,
  RUN_OVERLAY_ACTIVITY_EVENTS,
  RUN_OVERLAY_FADE_DELAY_MS,
} from './runOverlay';

describe('runOverlay', () => {
  it('returns visible class when overlay is visible', () => {
    expect(getRunOverlayOpacityClass(true)).toBe('opacity-100');
  });

  it('returns faded class when overlay is hidden', () => {
    expect(getRunOverlayOpacityClass(false)).toBe('opacity-35');
  });

  it('builds safe-area-aware overlay position style', () => {
    expect(getRunOverlayPositionStyle()).toEqual({
      top: 'max(12px, env(safe-area-inset-top))',
      left: 'max(12px, env(safe-area-inset-left))',
    });
  });

  it('supports custom overlay offset', () => {
    expect(getRunOverlayPositionStyle(20)).toEqual({
      top: 'max(20px, env(safe-area-inset-top))',
      left: 'max(20px, env(safe-area-inset-left))',
    });
  });

  it('exposes expected interaction events and fade delay', () => {
    expect(RUN_OVERLAY_FADE_DELAY_MS).toBe(2500);
    expect(RUN_OVERLAY_ACTIVITY_EVENTS).toEqual(['pointerdown', 'touchstart', 'scroll', 'keydown']);
  });
});
