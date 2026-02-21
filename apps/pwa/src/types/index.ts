export interface SuApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: string;
  isDefault?: boolean;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  appId: string;
  role: 'user' | 'assistant';
  content: string;
  version?: number;
  createdAt: string;
}

export interface StorageAdapter {
  listApps(): Promise<SuApp[]>;
  getApp(id: string): Promise<SuApp | null>;
  createApp(app: Omit<SuApp, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<SuApp>;
  updateApp(id: string, updates: Partial<SuApp>): Promise<SuApp>;
  deleteApp(id: string): Promise<void>;
  getChatHistory(appId: string): Promise<ChatMessage[]>;
  appendMessage(appId: string, msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage>;
  writeArtifact(appId: string, version: number, filename: string, content: string): Promise<void>;
  readArtifact(appId: string, version: number, filename: string): Promise<string>;
  listArtifacts(appId: string, version: number): Promise<Record<string, string>>;
}
