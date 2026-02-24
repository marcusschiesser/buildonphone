'use client';

import { useEffect, useState } from 'react';
import LoginScreen from './login-screen';

export default function LoginPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return <LoginScreen />;
}
