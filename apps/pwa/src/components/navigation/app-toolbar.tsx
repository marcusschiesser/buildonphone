'use client';

import type { ReactNode } from 'react';
import { IonButtons, IonToolbar } from '@ionic/react';

export function AppToolbar({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  return (
    <IonToolbar className="app-toolbar">
      {start ? <IonButtons slot="start">{start}</IonButtons> : null}
      <div className="app-toolbar__title" aria-label="App name">
        <strong>Claw2go</strong>
      </div>
      {end ? <IonButtons slot="end">{end}</IonButtons> : null}
    </IonToolbar>
  );
}
