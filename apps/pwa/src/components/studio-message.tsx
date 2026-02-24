import { IonItem, IonLabel, IonSpinner, IonText } from '@ionic/react';
import type { StudioThreadMessage } from '@/lib/ui/studioThread';
import { StudioMarkdownRenderer } from './studio/markdown-renderer';

export function StudioMessage({ message }: { message: StudioThreadMessage }) {
  const roleTone = message.role === 'user' ? 'primary' : message.role === 'status' ? 'warning' : 'medium';

  const roleLabel = message.role === 'status' ? 'Status' : message.role;

  return (
    <IonItem lines="inset" color={roleTone === 'medium' ? undefined : roleTone}>
      <IonLabel>
        <IonText color="medium">
          {roleLabel}
        </IonText>
        {message.isProgress ? (
          <div className="ion-margin-top">
            <IonSpinner name="crescent" color={roleTone} />
            <p className="ion-no-margin ion-margin-start">{message.content}</p>
          </div>
        ) : (
          <StudioMarkdownRenderer content={message.content} />
        )}
      </IonLabel>
    </IonItem>
  );
}
