'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { localStorageAdapter } from '@/lib/storage/db';
import { PreviewFrame } from '@/components/preview';

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const [files, setFiles] = useState<Record<string, string>>({
    'app.jsx': '',
  });

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const app = await localStorageAdapter.getApp(id);
      if (!app) {
        setFiles({
          'app.jsx': '',
        });
        return;
      }
      const nextFiles = await localStorageAdapter.listArtifacts(id, app.currentVersion);
      setFiles(nextFiles);
    })();
  }, [id]);

  return (
    <main className="h-screen w-screen bg-black p-3">
      <PreviewFrame files={files} />
    </main>
  );
}
