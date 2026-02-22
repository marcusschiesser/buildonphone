type ServerConfig = { hasServerKey: boolean };

let cache: ServerConfig | null = null;

export async function getServerConfig(): Promise<ServerConfig> {
  if (cache) return cache;
  const res = await fetch('/api/config');
  cache = await res.json();
  return cache!;
}
