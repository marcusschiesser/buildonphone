'use client';

import { useSyncExternalStore } from 'react';
import type { GenerationResult, GenerationSnapshot, GenerationState } from './types';

const COMPLETED_TTL_MS = 5 * 60 * 1000;
const EMPTY_GENERATION_MAP: ReadonlyMap<string, GenerationState> = new Map();

let revision = 0;
let byAppId = new Map<string, GenerationState>();
const listeners = new Set<() => void>();

function emit() {
  revision += 1;
  for (const listener of listeners) {
    listener();
  }
}

function now() {
  return Date.now();
}

function createDefaultState(appId: string): GenerationState {
  const timestamp = now();
  return {
    appId,
    busy: false,
    phase: 'idle',
    status: 'Idle',
    streamedText: '',
    currentToolCall: null,
    toolCallCount: 0,
    startedAt: timestamp,
    updatedAt: timestamp,
  };
}

function writeState(appId: string, updater: (prev: GenerationState) => GenerationState) {
  const prev = byAppId.get(appId) ?? createDefaultState(appId);
  const nextState = updater(prev);
  const nextMap = new Map(byAppId);
  nextMap.set(appId, nextState);
  byAppId = nextMap;
  cleanupCompletedGenerations(nextState.updatedAt);
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): GenerationSnapshot {
  return {
    revision,
    byAppId,
  };
}

export function getGeneration(appId: string): GenerationState | undefined {
  return byAppId.get(appId);
}

export function startGenerationState(appId: string) {
  const timestamp = now();
  writeState(appId, (prev) => ({
    ...prev,
    appId,
    busy: true,
    phase: 'preparing',
    status: 'Queuing prompt',
    streamedText: '',
    currentToolCall: null,
    toolCallCount: 0,
    result: undefined,
    startedAt: timestamp,
    updatedAt: timestamp,
  }));
}

export function patchGeneration(appId: string, patch: Partial<GenerationState>) {
  writeState(appId, (prev) => ({
    ...prev,
    ...patch,
    appId,
    updatedAt: now(),
  }));
}

export function setGenerationResult(appId: string, result: GenerationResult) {
  writeState(appId, (prev) => ({
    ...prev,
    busy: false,
    phase: result.ok ? 'done' : 'error',
    status: result.ok ? 'Done' : `Error: ${result.error ?? 'Generation failed'}`,
    result,
    updatedAt: now(),
  }));
}

export function consumeGenerationResult(appId: string): GenerationResult | undefined {
  const state = byAppId.get(appId);
  if (!state?.result) return undefined;
  const consumed = state.result;
  writeState(appId, (prev) => ({
    ...prev,
    streamedText: '',
    currentToolCall: null,
    toolCallCount: 0,
    result: undefined,
    updatedAt: now(),
  }));
  return consumed;
}

export function clearGeneration(appId: string) {
  if (!byAppId.has(appId)) return;
  const nextMap = new Map(byAppId);
  nextMap.delete(appId);
  byAppId = nextMap;
  emit();
}

export function cleanupCompletedGenerations(atTime = now()) {
  let mutated = false;
  const nextMap = new Map(byAppId);

  for (const [appId, state] of nextMap) {
    if (state.busy) continue;
    if (atTime - state.updatedAt <= COMPLETED_TTL_MS) continue;
    nextMap.delete(appId);
    mutated = true;
  }

  if (mutated) {
    byAppId = nextMap;
  }
}

export function useGeneration(appId: string): GenerationState | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().byAppId.get(appId),
    () => undefined
  );
}

export function useAnyBusy(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      for (const state of getSnapshot().byAppId.values()) {
        if (state.busy) return true;
      }
      return false;
    },
    () => false
  );
}

export function useGenerationMap(): ReadonlyMap<string, GenerationState> {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().byAppId,
    () => EMPTY_GENERATION_MAP
  );
}
