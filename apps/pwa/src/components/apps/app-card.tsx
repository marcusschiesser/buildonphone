'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SuApp } from '@/types';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonText,
} from '@ionic/react';

interface AppCardProps {
  app: SuApp;
  onRename: (appId: string, nextName: string) => Promise<void>;
  onDelete: (appId: string) => Promise<void>;
  generating?: boolean;
}

export function AppCard({ app, onRename, onDelete, generating = false }: AppCardProps) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(app.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cancelRename = () => {
    setIsRenaming(false);
    setNameDraft(app.name);
    setError('');
  };

  const saveRename = async () => {
    const next = nameDraft.trim();
    if (!next) {
      setError('Name is required.');
      return;
    }
    if (next === app.name) {
      cancelRename();
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onRename(app.id, next);
      setIsRenaming(false);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Failed to rename app.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonCard className="ion-no-margin">
      <IonCardHeader>
        <IonCardSubtitle>
          <>
            <IonBadge color={app.isDefault ? 'secondary' : 'medium'}>{app.isDefault ? 'Default' : 'My App'}</IonBadge>
            {' '}
            {generating ? <IonBadge color="tertiary">Generating...</IonBadge> : null}
          </>
        </IonCardSubtitle>
        <IonCardTitle>{app.name}</IonCardTitle>
      </IonCardHeader>

      <IonCardContent>
        {isRenaming ? (
          <>
            <IonLabel className="ion-display-block ion-margin-bottom">App Name</IonLabel>
            <IonItem lines="inset">
              <IonInput
                maxlength={80}
                value={nameDraft}
                onIonInput={(event) => setNameDraft(event.detail.value ?? '')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void saveRename();
                  if (event.key === 'Escape') cancelRename();
                }}
              />
            </IonItem>
            {error ? (
              <IonText color="danger" className="ion-display-block ion-margin-top">
                {error}
              </IonText>
            ) : null}
          </>
        ) : (
          <IonNote color="medium">{app.description || 'No description'}</IonNote>
        )}

        <div className="ion-margin-top">
          {isRenaming ? (
            <>
              <IonButton fill="clear" color="medium" disabled={busy} onClick={cancelRename}>
                Cancel
              </IonButton>
              <IonButton fill="outline" disabled={busy} onClick={() => void saveRename()}>
                Save
              </IonButton>
            </>
          ) : (
            <>
              <IonButton fill="outline" color="medium" onClick={() => router.push(`/run/${app.id}`)}>
                Run
              </IonButton>
              <IonButton color="primary" onClick={() => router.push(`/edit/${app.id}`)}>
                Edit
              </IonButton>
              <IonButton fill="clear" color="medium" onClick={() => setIsRenaming(true)}>
                Rename
              </IonButton>
              <IonButton fill="outline" color="danger" disabled={generating} onClick={() => void onDelete(app.id)}>
                Delete
              </IonButton>
            </>
          )}
        </div>
      </IonCardContent>
    </IonCard>
  );
}
