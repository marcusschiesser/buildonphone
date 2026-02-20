'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ChatMessage, SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import { Studio } from '@/components/studio';

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<SuApp | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const current = await localStorageAdapter.getApp(id);
      const history = await localStorageAdapter.getChatHistory(id);
      setApp(current);
      setMessages(history);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <main className="grid min-h-screen place-items-center text-zinc-300">Loading...</main>;
  }

  return <Studio appId={id} initialApp={app} initialMessages={messages} initialVersion={app?.currentVersion ?? 0} />;
}
