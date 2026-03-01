'use client';

import { useCallback, useRef, useState } from 'react';
import { hasAnthropicKey } from '@/lib/security/byok';
import { getServerConfig } from '@/lib/server-config';
import { AiAccessModal } from '@/components/ai-access-modal';
import { resolveAiAccessRequirements, type AiAccessRequirements } from './aiAccessRequirements';

export type AiAccessPurpose = 'generation' | 'preview-ai';

type ModalState = AiAccessRequirements & {
  purpose: AiAccessPurpose;
};

export class AuthRequiredError extends Error {
  code = 'AUTH_REQUIRED' as const;

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export function isAuthRequiredError(error: unknown): error is AuthRequiredError {
  return error instanceof AuthRequiredError;
}

export function useAiAccessGate() {
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const pendingResolveRef = useRef<((result: { ok: boolean }) => void) | null>(null);

  const settle = useCallback((result: { ok: boolean }) => {
    const resolve = pendingResolveRef.current;
    pendingResolveRef.current = null;
    setModalState(null);
    resolve?.(result);
  }, []);

  const ensureAiAccess = useCallback(
    async (options: { purpose: AiAccessPurpose; forcePassword?: boolean }): Promise<{ ok: boolean }> => {
      const [{ hasServerKey, requiresPassword, authenticated }, hasByokKey] = await Promise.all([
        getServerConfig({ refresh: true }),
        hasAnthropicKey(),
      ]);

      const requirements = resolveAiAccessRequirements({
        requiresPassword,
        authenticated,
        hasServerKey,
        hasByokKey,
        forcePassword: options.forcePassword,
      });

      if (!requirements.needsPassword && !requirements.needsByok) {
        return { ok: true };
      }

      return new Promise<{ ok: boolean }>((resolve) => {
        pendingResolveRef.current = resolve;
        setModalState({
          purpose: options.purpose,
          ...requirements,
        });
      });
    },
    []
  );

  const modal = modalState ? (
    <AiAccessModal
      isOpen
      purpose={modalState.purpose}
      needsPassword={modalState.needsPassword}
      needsByok={modalState.needsByok}
      onCancel={() => settle({ ok: false })}
      onSuccess={() => settle({ ok: true })}
    />
  ) : null;

  return { ensureAiAccess, modal };
}
