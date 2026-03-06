import { z } from 'zod';
import type { SharedAppSnapshot, SharedAppSnapshotPayload } from './contracts';

const sharedMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.string().min(1),
  version: z.number().int().min(1).optional(),
});

const sharedAppSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string(),
  icon: z.string(),
  theme: z.string(),
  currentVersion: z.number().int().min(1),
});

const artifactsSchema = z.record(z.string(), z.string()).refine(
  (artifacts) => Object.keys(artifacts).length > 0,
  'At least one artifact is required.'
);

export const sharedAppSnapshotPayloadSchema = z.object({
  app: sharedAppSchema,
  messages: z.array(sharedMessageSchema),
  artifacts: artifactsSchema,
});

export const sharedAppSnapshotSchema = sharedAppSnapshotPayloadSchema.extend({
  id: z.string().trim().min(1),
  createdAt: z.string().min(1),
  creatorUserId: z.string().trim().min(1).optional(),
});

export function parseSharedAppSnapshotPayload(input: unknown): SharedAppSnapshotPayload {
  return sharedAppSnapshotPayloadSchema.parse(input);
}

export function parseSharedAppSnapshot(input: unknown): SharedAppSnapshot {
  return sharedAppSnapshotSchema.parse(input);
}
