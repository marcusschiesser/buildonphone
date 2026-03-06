'use client';

import { useCallback, useRef, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { hasAnthropicKey } from '@/lib/security/byok';
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
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const pendingResolveRef = useRef<((result: { ok: boolean }) => void) | null>(null);

  const settle = useCallback((result: { ok: boolean }) => {
    const resolve = pendingResolveRef.current;
    pendingResolveRef.current = null;
    setModalState(null);
    resolve?.(result);
  }, []);

  const ensureAiAccess = useCallback(
    async (options: { purpose: AiAccessPurpose }): Promise<{ ok: boolean }> => {
      const hasByokKey = await hasAnthropicKey();

      const requirements = resolveAiAccessRequirements({
        isSignedIn: !!isSignedIn,
        hasByokKey,
        fakeGenerationEnabled: process.env.NEXT_PUBLIC_FAKE_GENERATION === '1' && options.purpose === 'generation',
      });

      if (!requirements.needsSignIn && !requirements.needsByok) {
        return { ok: true };
      }

      if (requirements.needsSignIn) {
        await clerk.openSignIn();
        return { ok: false };
      }

      return new Promise<{ ok: boolean }>((resolve) => {
        pendingResolveRef.current = resolve;
        setModalState({
          purpose: options.purpose,
          ...requirements,
        });
      });
    },
    [clerk, isSignedIn]
  );

  const modal = modalState ? (
    <AiAccessModal
      isOpen
      purpose={modalState.purpose}
      needsByok={modalState.needsByok}
      onCancel={() => settle({ ok: false })}
      onSuccess={() => settle({ ok: true })}
    />
  ) : null;

  return { ensureAiAccess, modal };
}
