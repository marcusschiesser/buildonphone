'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { captureAnalyticsEvent, identifyAnalyticsUser } from '@/lib/analytics/telemetry';

export function PageTracker() {
  const pathname = usePathname();
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;
    identifyAnalyticsUser(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    });
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
