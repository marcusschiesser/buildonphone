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
  const [alias, setAlias] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pendingAfterLogin, setPendingAfterLogin] = useState(false);

  useEffect(() => {
    void Promise.all([getServerConfig(), Promise.resolve()]).then(([cfg]) => {
      setRequiresPassword(cfg.requiresPassword);
      setAlias(getIdentityAlias());
      setDone(isIdentityPromptDone());
      setPendingAfterLogin(isIdentityPromptPendingAfterLogin());
    });
  }, []);

  useEffect(() => {
    setAlias(getIdentityAlias());
    setDone(isIdentityPromptDone());
    setPendingAfterLogin(isIdentityPromptPendingAfterLogin());
  }, [pathname]);

  useEffect(() => {
    if (alias) identifyAnalyticsUser(alias);
  }, [alias]);

  const shouldOpen = useMemo(() => {
    if (!mounted || pathname === '/login') return false;
    if (requiresPassword === null || alias) return false;
    if (pendingAfterLogin) return true;
    if (done) return false;
    return !requiresPassword;
  }, [alias, done, mounted, pathname, pendingAfterLogin, requiresPassword]);

  const onSkip = () => {
    markIdentityPromptSkipped();
    setDone(true);
    setPendingAfterLogin(false);
    captureAnalyticsEvent('identity_prompt_skipped');
  };

  const onSave = (rawValue: string) => {
    const nextAlias = rawValue.trim();
    if (!nextAlias) return false;
    setIdentityAlias(nextAlias);
    identifyAnalyticsUser(nextAlias);
    setAlias(nextAlias);
    setDone(true);
    setPendingAfterLogin(false);
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
