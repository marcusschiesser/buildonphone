import { describe, expect, it } from 'vitest';
import { parseSharedAppSnapshot, parseSharedAppSnapshotPayload } from './schema';

describe('sharing schema', () => {
  it('accepts a complete shared snapshot payload', () => {
    expect(
      parseSharedAppSnapshotPayload({
        app: {
          name: 'Habit Tracker',
          description: 'Track streaks',
          icon: '',
          theme: 'mint',
          currentVersion: 3,
        },
        messages: [
          {
            role: 'user',
            content: 'Build me a habit tracker',
            createdAt: '2026-03-06T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Done',
            createdAt: '2026-03-06T10:01:00.000Z',
            version: 3,
          },
        ],
        artifacts: {
          'app.jsx': 'export default function App() { return null; }',
        },
      })
    ).toMatchObject({
      app: {
        name: 'Habit Tracker',
        currentVersion: 3,
      },
    });
  });

  it('rejects payloads without generated artifacts', () => {
    expect(() =>
      parseSharedAppSnapshotPayload({
        app: {
          name: 'Habit Tracker',
          description: '',
          icon: '',
          theme: '',
          currentVersion: 1,
        },
        messages: [],
        artifacts: {},
      })
    ).toThrow('At least one artifact is required.');
  });

  it('accepts a stored snapshot shape with metadata', () => {
    expect(
      parseSharedAppSnapshot({
        id: 'share_123',
        createdAt: '2026-03-06T10:02:00.000Z',
        creatorUserId: 'user_123',
        app: {
          name: 'Habit Tracker',
          description: '',
          icon: '',
          theme: '',
          currentVersion: 1,
        },
        messages: [],
        artifacts: {
          'app.jsx': 'export default function App() { return null; }',
        },
      })
    ).toMatchObject({
      id: 'share_123',
      creatorUserId: 'user_123',
    });
  });
});
