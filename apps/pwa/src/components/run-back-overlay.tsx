'use client';

import { IonButton, IonIcon } from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getRunOverlayOpacityClass,
  getRunOverlayPositionStyle,
  RUN_OVERLAY_ACTIVITY_EVENTS,
  RUN_OVERLAY_FADE_DELAY_MS,
} from '@/lib/ui/runOverlay';
import styles from './run-back-overlay.module.css';

export function RunBackOverlay() {
  const router = useRouter();
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
      className={`${styles.overlay} ${getRunOverlayOpacityClass(overlayVisible)}`}
      style={getRunOverlayPositionStyle()}
      onMouseEnter={() => setOverlayVisible(true)}
    >
      <IonButton
        shape="round"
        fill="solid"
        color="dark"
        aria-label="Back to apps"
        title="Back to apps"
        onClick={() => router.push('/')}
      >
        <IonIcon slot="icon-only" icon={arrowBackOutline} />
      </IonButton>
    </div>
  );
}
