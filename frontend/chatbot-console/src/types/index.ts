// ユーザー関連の型定義
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

// 認証状態
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// チャットボット設定
export interface ChatbotConfig {
  id: string;
  name: string;
  description: string;
  githubRepo: string;
  s3Folder: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ウェブフック設定
export interface WebhookConfig {
  id: string;
  chatbotId: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ユーザーアクセス権限
export interface UserAccess {
  id: string;
  chatbotId: string;
  userId: string;
  permission: 'read' | 'write' | 'admin';
  createdAt: string;
  updatedAt: string;
}

// GitHubリポジトリ情報
export interface GitHubRepo {
  name: string;
  fullName: string;
  private: boolean;
  description: string;
  url: string;
}

// S3フォルダ情報
export interface S3Folder {
  name: string;
  path: string;
  size: number;
  lastModified: string;
}

// フォーム関連
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'checkbox';
  value: string | boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  required?: boolean;
  validation?: (value: any) => string | null;
}

// ボット設定（新機能）
export interface BotSettings {
  botId: string;
  botName: string;
  description: string;
  creatorId: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

// ボット設定作成/更新リクエスト
export interface BotSettingsCreateRequest {
  botName: string;
  description?: string;
  creatorId: string;
  isActive?: boolean;
}

export interface BotSettingsUpdateRequest {
  botName?: string;
  description?: string;
  isActive?: boolean;
}

// ボット設定一覧レスポンス
export interface BotSettingsListResponse {
  bots: BotSettings[];
  count: number;
}

// API応答
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}