'use client';

import { useEffect, useState } from 'react';
import { useIsClient } from '@/lib/ui/useIsClient';
import { useParams } from 'next/navigation';
import { IonContent, IonPage, IonSpinner, IonText } from '@ionic/react';
import type { ChatMessage, SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import { Studio } from '@/components/studio';
import styles from './page.module.css';

export default function EditPage() {
  const { id } = useParams<{ id: string }>();  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<SuApp | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const current = await localStorageAdapter.getApp(id);
      const history = await localStorageAdapter.getChatHistory(id);
      let appJsx: string | null = null;
      if (current?.currentVersion && current.currentVersion > 0) {
        try {
          appJsx = await localStorageAdapter.readArtifact(id, current.currentVersion, 'app.jsx');
        } catch {
          appJsx = null;
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        const assistantMarkdown = history
          .filter((message) => message.role === 'assistant')
          .at(-1)?.content ?? null;
        const assistantMessageQuoted = `\`${(assistantMarkdown ?? '').replace(/`/g, '\\`')}\``;
        console.debug(`edit page loaded\nappId: ${id}\nassistantMessage: ${assistantMessageQuoted}`);
        console.debug(`appJsx:\n${appJsx ?? ''}`);
      }

      setApp(current);
      setMessages(history);
      setLoading(false);
    })();
  }, [id]);

  const mounted = useIsClient();

  if (!mounted) return null;

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div className={`${styles.fillVh} ${styles.centerGrid}`}>
            <div className={styles.actionRow}>
              <IonSpinner name="crescent" />
              <IonText color="medium">Loading...</IonText>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return <Studio appId={id} initialApp={app} initialMessages={messages} initialVersion={app?.currentVersion ?? 0} />;
}
