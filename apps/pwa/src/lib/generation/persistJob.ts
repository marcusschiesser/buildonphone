const ACTIVE_JOB_KEY_PREFIX = 'claw2go:active-job:';

export interface PersistedJob {
  jobId: string;
  appId: string;
  nextVersion: number;
  appName: string;
}

export function persistActiveJob(job: PersistedJob): void {
  try {
    localStorage.setItem(`${ACTIVE_JOB_KEY_PREFIX}${job.appId}`, JSON.stringify(job));
  } catch {
    // localStorage may be unavailable (private mode, quota exceeded, etc.)
  }
}

export function clearPersistedJob(appId: string): void {
  try {
    localStorage.removeItem(`${ACTIVE_JOB_KEY_PREFIX}${appId}`);
  } catch {
    // ignore
  }
}

export function getPersistedJob(appId: string): PersistedJob | null {
  try {
    const raw = localStorage.getItem(`${ACTIVE_JOB_KEY_PREFIX}${appId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedJob;
  } catch {
    return null;
  }
}

export function getAllPersistedJobs(): PersistedJob[] {
  try {
    const jobs: PersistedJob[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(ACTIVE_JOB_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            jobs.push(JSON.parse(raw) as PersistedJob);
          } catch {
            // skip malformed entries
          }
        }
      }
    }
    return jobs;
  } catch {
    return [];
  }
}
