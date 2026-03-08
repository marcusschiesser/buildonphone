'use client';

import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/nextjs';

const fakeGenerationEnabled = process.env.NEXT_PUBLIC_FAKE_GENERATION === '1';
const useAppAuthImpl = fakeGenerationEnabled ? () => ({ isSignedIn: false }) : useAuth;
const useAppUserImpl = fakeGenerationEnabled ? () => ({ user: null }) : useUser;
const useAppClerkImpl = fakeGenerationEnabled
  ? () => ({
      openSignIn: async () => undefined,
      signOut: async () => undefined,
    })
  : useClerk;

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  if (fakeGenerationEnabled) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}

export function useAppAuth() {
  return useAppAuthImpl();
}

export function useAppUser() {
  return useAppUserImpl();
}

export function useAppClerk() {
  return useAppClerkImpl();
}
