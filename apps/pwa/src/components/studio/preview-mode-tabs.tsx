import { IonSegment, IonSegmentButton, IonLabel } from '@ionic/react';

type PreviewMode = 'preview' | 'code';

export function PreviewModeTabs({
  mode,
  onChange,
}: {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}) {
  return (
    <IonSegment value={mode} onIonChange={(event) => onChange((event.detail.value as PreviewMode) ?? 'preview')}>
      <IonSegmentButton value="preview">
        <IonLabel>Preview</IonLabel>
      </IonSegmentButton>
      <IonSegmentButton value="code">
        <IonLabel>Code</IonLabel>
      </IonSegmentButton>
    </IonSegment>
  );
}
