import { IonCard, IonCardContent, IonText } from '@ionic/react';
import styles from './fallback-panel.module.css';

export function PreviewFallbackPanel() {
  return (
    <IonCard className={styles.card}>
      <IonCardContent className={styles.content}>
        <div>
          <h2 className={styles.title}>No preview yet</h2>
          <IonText color="medium">Generate an app to see output.</IonText>
        </div>
      </IonCardContent>
    </IonCard>
  );
}
