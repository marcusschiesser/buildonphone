import { IonSpinner } from '@ionic/react';
import type { StudioThreadMessage } from '@/lib/ui/studioThread';
import { StudioMarkdownRenderer } from './studio/markdown-renderer';
import styles from './studio-message.module.css';

export function StudioMessage({ message }: { message: StudioThreadMessage }) {
  const roleLabel = message.role === 'status' ? null : message.role;
  const rowClass = message.role === 'user' ? styles.userRow : styles.assistantRow;
  const bubbleClass =
    message.role === 'user' ? styles.userBubble : message.role === 'status' ? styles.statusBubble : styles.assistantBubble;

  return (
    <div className={`${styles.row} ${rowClass}`}>
      <div className={`${styles.bubble} ${bubbleClass}`}>
        {roleLabel ? <p className={styles.roleLabel}>{roleLabel}</p> : null}
        {message.isProgress ? (
          <div className={styles.progressRow}>
            <IonSpinner name="crescent" color={message.role === 'status' ? 'warning' : 'primary'} />
            <p className={styles.progressText}>{message.content}</p>
          </div>
        ) : (
          <StudioMarkdownRenderer content={message.content} />
        )}
      </div>
    </div>
  );
}
