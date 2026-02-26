'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IonAlert } from '@ionic/react';
import {
  getIdentityAlias,
  isIdentityPromptDone,
  isIdentityPromptPendingAfterLogin,
  markIdentityPromptSkipped,
  setIdentityAlias,
} from '@/lib/analytics/identity';
import { captureAnalyticsEvent, identifyAnalyticsUser } from '@/lib/analytics/telemetry';
import { getServerConfig } from '@/lib/server-config';
import { useIsClient } from '@/lib/ui/useIsClient';

export function IdentityPrompt() {
  const pathname = usePathname();
  const mounted = useIsClient();
  const [requiresPassword, setRequiresPassword] = useState<boolean | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const storageNonce = refreshNonce;

  useEffect(() => {
    void getServerConfig().then((cfg) => setRequiresPassword(cfg.requiresPassword));
  }, []);

  const alias = mounted ? getIdentityAlias() : null;
  const done = mounted ? isIdentityPromptDone() : false;
  const pendingAfterLogin = mounted ? isIdentityPromptPendingAfterLogin() : false;

  useEffect(() => {
    if (alias) identifyAnalyticsUser(alias);
  }, [alias]);

  const shouldOpen = useMemo(() => {
    void storageNonce;
    if (!mounted || pathname === '/login') return false;
    if (requiresPassword === null || alias) return false;
    if (pendingAfterLogin) return true;
    if (done) return false;
    return !requiresPassword;
  }, [alias, done, mounted, pathname, pendingAfterLogin, requiresPassword, storageNonce]);

  const onSkip = () => {
    markIdentityPromptSkipped();
    setRefreshNonce((prev) => prev + 1);
    captureAnalyticsEvent('identity_prompt_skipped');
  };

  const onSave = (rawValue: string) => {
    const nextAlias = rawValue.trim();
    if (!nextAlias) return false;
    setIdentityAlias(nextAlias);
    identifyAnalyticsUser(nextAlias);
    setRefreshNonce((prev) => prev + 1);
    captureAnalyticsEvent('identity_prompt_submitted', { alias: nextAlias });
    return true;
  };

  if (!mounted || !shouldOpen) return null;

  return (
    <IonAlert
      isOpen
      header="Your Name"
      subHeader="Help me to map your feedback."
      backdropDismiss={false}
      inputs={[
        {
          name: 'alias',
          type: 'text',
          placeholder: 'Name',
        },
      ]}
      buttons={[
        {
          text: 'Skip',
          role: 'cancel',
          handler: onSkip,
        },
        {
          text: 'Save',
          role: 'confirm',
          handler: (input) => onSave((input?.alias as string | undefined) ?? ''),
        },
      ]}
    />
  );
}
