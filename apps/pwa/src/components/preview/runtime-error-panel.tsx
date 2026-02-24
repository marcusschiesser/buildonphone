import { IonButton, IonCard, IonCardContent, IonText } from '@ionic/react';
import type { PreviewFixPayload } from '@/lib/ui/previewRuntimeError';
import styles from './runtime-error-panel.module.css';

export function PreviewRuntimeErrorPanel({
  error,
  onFix,
}: {
  error: PreviewFixPayload;
  onFix?: () => void;
}) {
  return (
    <div className={styles.panel}>
      <IonCard color="danger" className={styles.card}>
        <IonCardContent>
          <IonText color="light" className={styles.kicker}>
            Generated App Runtime Error
          </IonText>
          <p className={styles.message}>{error.errorMessage || 'Unknown runtime error'}</p>
          {error.stack?.trim() ? <pre className={styles.stack}>{error.stack}</pre> : null}
          {onFix ? (
            <div className={styles.actions}>
              <IonButton size="small" fill="outline" color="light" onClick={onFix}>
                Fix
              </IonButton>
            </div>
          ) : null}
        </IonCardContent>
      </IonCard>
    </div>
  );
}
