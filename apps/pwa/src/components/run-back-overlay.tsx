'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getRunOverlayOpacityClass,
  getRunOverlayPositionStyle,
  RUN_OVERLAY_ACTIVITY_EVENTS,
  RUN_OVERLAY_FADE_DELAY_MS,
} from '@/lib/ui/runOverlay';

export function RunBackOverlay() {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleFade = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => setOverlayVisible(false), RUN_OVERLAY_FADE_DELAY_MS);
  }, []);

  useEffect(() => {
    scheduleFade();
    const onActivity = () => {
      setOverlayVisible(true);
      scheduleFade();
    };

    for (const eventName of RUN_OVERLAY_ACTIVITY_EVENTS) {
      if (eventName === 'keydown') {
        window.addEventListener(eventName, onActivity);
      } else {
        window.addEventListener(eventName, onActivity, { passive: true });
      }
    }

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      for (const eventName of RUN_OVERLAY_ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
    };
  }, [scheduleFade]);

  return (
    <div
      className={`fixed z-20 transition-opacity duration-300 hover:opacity-100 ${getRunOverlayOpacityClass(overlayVisible)}`}
      style={getRunOverlayPositionStyle()}
      onMouseEnter={() => setOverlayVisible(true)}
    >
      <Link
        href="/"
        aria-label="Back to apps"
        title="Back to apps"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white/90 backdrop-blur-sm hover:bg-black/55"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}
