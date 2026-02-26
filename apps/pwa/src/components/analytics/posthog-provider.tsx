'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics/telemetry';

export function PostHogProvider() {
  useEffect(() => {
    void initAnalytics();
  }, []);

  return null;
}

