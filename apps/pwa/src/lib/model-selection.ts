'use client';

const MODEL_STORAGE_KEY = 'buildonphone_selected_model';

export function getSelectedModelPreference(): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(MODEL_STORAGE_KEY)?.trim();
  return value ? value : null;
}

export function setSelectedModelPreference(model: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = model.trim();
  if (!trimmed) {
    window.localStorage.removeItem(MODEL_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(MODEL_STORAGE_KEY, trimmed);
}
