'use client';

import { useEffect, useMemo, useState } from 'react';
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

export function AiAccessModal({
  isOpen,
  purpose,
  needsByok,
  onCancel,
  onSuccess,
}: {
  isOpen: boolean;
  purpose: 'generation' | 'preview-ai';
  needsByok: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [byok, setByok] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!needsByok) {
      onSuccess();
    }
  }, [needsByok, onSuccess]);

  const ctaLabel = useMemo(() => {
    return purpose === 'generation' ? 'Save Key and Generate' : 'Save Key and Continue';
  }, [purpose]);

  const canSubmit = (!needsByok || byok.trim().length > 0) && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');

    try {
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
          <IonTitle>Anthropic Key Required</IonTitle>
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
              Provide your Anthropic key for using AI features.
          </p>
        </IonText>

        <IonList inset>
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
