type ServerConfig = {
  jobTimeoutMs: number;
};

let cache: ServerConfig | null = null;

export async function getServerConfig(options?: { refresh?: boolean }): Promise<ServerConfig> {
  if (!options?.refresh && cache) return cache;
  const res = await fetch('/api/config');
  cache = await res.json();
  return cache!;
}
