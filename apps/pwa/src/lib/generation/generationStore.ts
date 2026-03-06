'use client';

import { useSyncExternalStore } from 'react';
import { isTerminalGenerationStatus } from './serverTypes';
import type { GenerationResult, GenerationSnapshot, GenerationState, PersistedGenerationJob } from './clientTypes';

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
    id: '',
    nextVersion: 0,
    appName: 'My App',
    busy: false,
    phase: 'idle',
    statusText: 'Idle',
    streamedText: '',
    currentToolCall: null,
    toolCallCount: 0,
    applyState: 'pending',
    createdAt: timestamp,
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

function deriveBusy(state: Pick<GenerationState, 'phase' | 'result' | 'applyState'>): boolean {
  if (state.result) return false;
  if (state.phase === 'idle') return false;
  if (state.applyState === 'applying') return true;
  return !isTerminalGenerationStatus(state.phase);
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

export function hydrateGeneration(job: PersistedGenerationJob) {
  writeState(job.appId, (prev) => ({
    ...prev,
    ...job,
    phase: job.status,
    busy: deriveBusy({ phase: job.status, result: prev.result, applyState: job.applyState }),
  }));
}

export function hydrateGenerations(jobs: PersistedGenerationJob[]) {
  for (const job of jobs) {
    hydrateGeneration(job);
  }
}

export function startGenerationState(appId: string) {
  const timestamp = now();
  writeState(appId, (prev) => ({
      ...prev,
      busy: true,
      id: prev.id,
      phase: 'queued',
    statusText: 'Queuing prompt',
    streamedText: '',
    currentToolCall: null,
    toolCallCount: 0,
    result: undefined,
    applyState: 'pending',
    updatedAt: timestamp,
    createdAt: prev.createdAt || timestamp,
  }));
}

export function patchGeneration(appId: string, patch: Partial<GenerationState>) {
  writeState(appId, (prev) => {
    const next = {
      ...prev,
      ...patch,
      appId,
      updatedAt: now(),
    };

    return {
      ...next,
      busy: deriveBusy({
        phase: next.phase,
        result: next.result,
        applyState: next.applyState,
      }),
    };
  });
}

export function setGenerationResult(appId: string, result: GenerationResult) {
  writeState(appId, (prev) => {
    const phase = result.ok ? 'succeeded' : 'failed';
    return {
      ...prev,
      busy: false,
      phase,
      statusText: result.ok ? 'Done' : `Error: ${result.error ?? 'Generation failed'}`,
      applyState: 'applied',
      result,
      updatedAt: now(),
      completedAt: result.completedAt,
    };
  });
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
    busy: false,
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
