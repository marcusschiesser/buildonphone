'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { captureAnalyticsEvent, identifyAnalyticsUser, resetAnalyticsUser } from '@/lib/analytics/telemetry';
import { useAppUser } from '@/lib/auth/client';

export function PageTracker() {
  const pathname = usePathname();
  const { user } = useAppUser();
  const identifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      if (identifiedUserIdRef.current) {
        resetAnalyticsUser();
        identifiedUserIdRef.current = null;
      }
      return;
    }

    if (identifiedUserIdRef.current === user.id) {
      return;
    }

    identifyAnalyticsUser(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    identifiedUserIdRef.current = user.id;
  }, [user]);

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
