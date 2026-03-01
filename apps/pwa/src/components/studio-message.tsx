import { useState } from 'react';
import { IonSpinner } from '@ionic/react';
import type { StudioThreadMessage } from '@/lib/ui/studioThread';
import { StudioMarkdownRenderer } from './studio/markdown-renderer';
import styles from './studio-message.module.css';

export function StudioMessage({ message }: { message: StudioThreadMessage }) {
  const [copied, setCopied] = useState(false);
  const roleLabel = message.role === 'status' ? null : message.role;
  const rowClass = message.role === 'user' ? styles.userRow : styles.assistantRow;
  const bubbleClass =
    message.role === 'user' ? styles.userBubble : message.role === 'status' ? styles.statusBubble : styles.assistantBubble;

  const handleCopy = () => {
    if (message.isProgress) return;
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard write denied or unavailable — silently ignore
    });
  };

  return (
    <div className={`${styles.row} ${rowClass}`}>
      <div className={`${styles.bubble} ${bubbleClass} ${message.isProgress ? '' : styles.copyable}`} onClick={handleCopy}>
        {roleLabel ? <p className={styles.roleLabel}>{copied ? 'Copied!' : roleLabel}</p> : null}
        {copied && !roleLabel ? <p className={styles.copiedFeedback}>Copied!</p> : null}
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
