'use client';

import { useMemo } from 'react';
import { Studio } from '@/components/studio';
import { safeRandomId } from '@/lib/id';

export default function CreatePage() {
  const appId = useMemo(() => safeRandomId('app'), []);
  return <Studio appId={appId} />;
}
