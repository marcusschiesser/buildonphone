'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAnalyticsEvent } from '@/lib/analytics/telemetry';

export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const query = typeof window === 'undefined' ? '' : window.location.search.replace(/^\?/, '');
    captureAnalyticsEvent('page_view_custom', {
      path: pathname,
      query,
      url: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname]);

  return null;
}
