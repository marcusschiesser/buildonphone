'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SuApp } from '@/types';
import {
  IonBadge,
  IonAlert,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonGrid,
  IonInput,
  IonNote,
  IonRow,
  IonText,
} from '@ionic/react';
import { captureAnalyticsEvent } from '@/lib/analytics/telemetry';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cancelRename = () => {
    setIsRenaming(false);
    setNameDraft(app.name);
    setError('');
  };

  const startRename = () => {
    setNameDraft(app.name);
    setError('');
    setIsRenaming(true);
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
      captureAnalyticsEvent('app_rename_saved', {
        appId: app.id,
        nameLength: next.length,
      });
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Failed to rename app.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonCard className="ion-no-margin app-card">
      <IonCardHeader>
        <IonCardSubtitle>
          <>
            <IonBadge color={app.isDefault ? 'secondary' : 'medium'}>{app.isDefault ? 'Default' : 'My App'}</IonBadge>
            {' '}
            {generating ? <IonBadge color="tertiary">Generating...</IonBadge> : null}
          </>
        </IonCardSubtitle>
        <IonCardTitle>
          {isRenaming ? (
            <IonInput
              className="app-card-title-input"
              aria-label="App name"
              maxlength={80}
              value={nameDraft}
              autofocus
              onIonInput={(event) => setNameDraft(event.detail.value ?? '')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveRename();
                if (event.key === 'Escape') cancelRename();
              }}
            />
          ) : (
            <span
              style={{ cursor: 'text' }}
              onClick={() => {
                captureAnalyticsEvent('app_rename_started', { appId: app.id });
                startRename();
              }}
            >
              {app.name}
            </span>
          )}
        </IonCardTitle>
      </IonCardHeader>

      <IonCardContent className="app-card-content">
        <IonNote color="medium" className="app-card-description">
          {app.description || 'No description'}
        </IonNote>
        {error ? (
          <IonText color="danger" className="ion-display-block ion-margin-top">
            {error}
          </IonText>
        ) : null}

        <IonGrid className="ion-no-padding ion-margin-top app-card-actions">
          <IonRow className={isRenaming ? 'app-card-actions-row' : 'app-card-actions-row ion-justify-content-between'}>
          {isRenaming ? (
            <>
              <IonCol size="6">
                <IonButton expand="block" size="small" fill="clear" color="medium" disabled={busy} onClick={cancelRename}>
                  Cancel
                </IonButton>
              </IonCol>
              <IonCol size="6">
                <IonButton expand="block" size="small" fill="outline" disabled={busy} onClick={() => void saveRename()}>
                  Save
                </IonButton>
              </IonCol>
            </>
          ) : (
            <>
              <IonCol size="auto" className="ion-no-padding">
                <div className="app-card-actions-group app-card-actions-group--left">
                  <IonButton
                    size="small"
                    fill="outline"
                    color="medium"
                    onClick={() => {
                      captureAnalyticsEvent('app_run_clicked', { appId: app.id });
                      router.push(`/run/${app.id}`);
                    }}
                  >
                    Run
                  </IonButton>
                  <IonButton
                    size="small"
                    color="primary"
                    onClick={() => {
                      captureAnalyticsEvent('app_edit_clicked', { appId: app.id });
                      router.push(`/edit/${app.id}`);
                    }}
                  >
                    Edit
                  </IonButton>
                </div>
              </IonCol>
              <IonCol size="auto" className="ion-no-padding">
                <div className="app-card-actions-group app-card-actions-group--right">
                  <IonButton
                    size="small"
                    fill="clear"
                    color="medium"
                    onClick={() => {
                      captureAnalyticsEvent('app_rename_started', { appId: app.id });
                      startRename();
                    }}
                  >
                    Rename
                  </IonButton>
                  <IonButton
                    size="small"
                    fill="outline"
                    color="danger"
                    disabled={generating}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete
                  </IonButton>
                </div>
              </IonCol>
            </>
          )}
          </IonRow>
        </IonGrid>
        <IonAlert
          isOpen={showDeleteConfirm}
          onDidDismiss={() => setShowDeleteConfirm(false)}
          header="Delete App"
          message={`Are you sure you want to delete \"${app.name}\"? This cannot be undone.`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => {
                void (async () => {
                  await onDelete(app.id);
                  captureAnalyticsEvent('app_deleted', { appId: app.id });
                })();
              },
            },
          ]}
        />
      </IonCardContent>
    </IonCard>
  );
}
