'use client';

import { useMemo, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { setAnthropicKey } from '@/lib/security/byok';
import { clearServerConfigCache } from '@/lib/server-config';

export function AiAccessModal({
  isOpen,
  purpose,
  needsPassword,
  needsByok,
  onCancel,
  onSuccess,
}: {
  isOpen: boolean;
  purpose: 'generation' | 'preview-ai';
  needsPassword: boolean;
  needsByok: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [byok, setByok] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ctaLabel = useMemo(() => {
    if (needsPassword && needsByok) {
      return purpose === 'generation' ? 'Unlock and Generate' : 'Unlock and Continue';
    }
    if (needsPassword) {
      return purpose === 'generation' ? 'Unlock and Generate' : 'Unlock and Continue';
    }
    return purpose === 'generation' ? 'Save Key and Generate' : 'Save Key and Continue';
  }, [needsByok, needsPassword, purpose]);

  const canSubmit = (!needsPassword || password.trim().length > 0) && (!needsByok || byok.trim().length > 0) && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');

    try {
      if (needsPassword) {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ password: password.trim() }),
        });

        if (!res.ok) {
          setError('Invalid password');
          return;
        }

        clearServerConfigCache();
      }

      if (needsByok) {
        await setAnthropicKey(byok.trim());
      }

      onSuccess();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to continue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <IonModal isOpen={isOpen} backdropDismiss={false}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{purpose === 'generation' ? 'Unlock Generation' : 'Unlock AI Features'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onCancel} disabled={submitting}>
              Cancel
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText color="medium">
          <p>
            {purpose === 'generation'
              ? 'Credentials are only required when you start app generation.'
              : 'Credentials are only required when the preview uses host AI features.'}
          </p>
        </IonText>

        <IonList inset>
          {needsPassword ? (
            <IonItem lines="inset">
              <IonLabel position="stacked">Password</IonLabel>
              <IonInput
                type="password"
                value={password}
                onIonInput={(event) => setPassword(event.detail.value ?? '')}
                autocomplete="current-password"
              />
            </IonItem>
          ) : null}
          {needsByok ? (
            <IonItem lines="inset">
              <IonLabel position="stacked">Anthropic BYOK</IonLabel>
              <IonInput
                type="password"
                value={byok}
                onIonInput={(event) => setByok(event.detail.value ?? '')}
                placeholder="sk-ant-..."
              />
            </IonItem>
          ) : null}
        </IonList>

        {needsPassword ? (
          <IonNote color="medium" className="ion-display-block ion-margin-top">
            To get the password, send a message to{' '}
            <a href="https://www.linkedin.com/in/marcusschiesser/" target="_blank" rel="noreferrer">
              marcusschiesser on LinkedIn
            </a>
            .
          </IonNote>
        ) : null}

        {needsByok ? (
          <IonNote color="medium" className="ion-display-block ion-margin-top">
            Get an Anthropic key from{' '}
            <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer">
              platform.claude.com/settings/keys
            </a>
            . Your key is encrypted in browser storage and never persisted server-side.
          </IonNote>
        ) : null}

        {error ? (
          <IonText color="danger" className="ion-display-block ion-margin-top">
            {error}
          </IonText>
        ) : null}

        <IonButton expand="block" className="ion-margin-top" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Working...' : ctaLabel}
        </IonButton>
      </IonContent>
    </IonModal>
  );
}
