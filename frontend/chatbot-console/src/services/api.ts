/**
 * API通信サービス
 * バックエンドとの通信を管理
 */

// API設定
// vite.config.jsのプロキシ設定を使用するため、相対パスで指定
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// トークン管理
const TOKEN_KEY = 'auth_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// HTTPクライアント
class ApiClient {
  private baseURL: string;
  private requestCache: Map<string, Promise<any>> = new Map(); // リクエストキャッシュ
  private pendingRequests: Set<string> = new Set(); // 進行中のリクエスト追跡

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // リクエストキーを生成
  private getRequestKey(path: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body || '';
    return `${method}:${path}:${body}`;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const requestKey = this.getRequestKey(path, options);
    
    // 同じリクエストが既に進行中の場合は、そのPromiseを返す
    if (this.requestCache.has(requestKey)) {
      console.log(`[API] Reusing cached request for: ${requestKey}`);
      return this.requestCache.get(requestKey);
    }

    // 重複リクエストをチェック
    if (this.pendingRequests.has(requestKey)) {
      console.log(`[API] Blocking duplicate request for: ${requestKey}`);
      throw new Error('Duplicate request blocked');
    }

    this.pendingRequests.add(requestKey);

    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Promise を作成してキャッシュに保存
    const requestPromise = fetch(`${this.baseURL}${path}`, {
      ...options,
      headers,
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      return response.json();
    }).finally(() => {
      // リクエスト完了後にキャッシュと進行中リストから削除
      this.requestCache.delete(requestKey);
      this.pendingRequests.delete(requestKey);
    });

    // GET リクエストのみキャッシュする（短時間）
    if (!options.method || options.method === 'GET') {
      this.requestCache.set(requestKey, requestPromise);
      // 1秒後にキャッシュから削除
      setTimeout(() => {
        this.requestCache.delete(requestKey);
      }, 1000);
    }

    return requestPromise;
  }

  // 認証API
  async register(email: string, password: string, name: string) {
    const response = await this.request<{
      userId: string;
      email: string;
      name: string;
      role: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<{
      token: string;
      user: {
        userId: string;
        email: string;
        name: string;
        role: string;
      };
      expiresAt: number;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // トークンを保存
    setToken(response.token);
    
    return response;
  }

  async getCurrentUser() {
    const response = await this.request<{
      userId: string;
      email: string;
      name: string;
      role: string;
      createdAt: number;
      updatedAt: number;
    }>('/api/auth/me', {
      method: 'GET',
    });
    return response;
  }

  async logout() {
    await this.request('/api/auth/logout', {
      method: 'POST',
    });
    removeToken();
  }

  async updateProfile(data: { email?: string; name?: string; password?: string }) {
    const response = await this.request<{
      userId: string;
      email: string;
      name: string;
      role: string;
      createdAt: number;
      updatedAt: number;
    }>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  // ボット管理API
  async getBots(creatorId?: string) {
    const params = creatorId ? `?creatorId=${creatorId}` : '';
    const response = await this.request<{
      bots: Array<{
        botId: string;
        botName: string;
        description: string;
        creatorId: string;
        createdAt: number;
        updatedAt: number;
        isActive: boolean;
      }>;
      count: number;
    }>(`/api/bots${params}`, {
      method: 'GET',
    });
    return response;
  }

  async getBot(botId: string) {
    const response = await this.request<{
      botId: string;
      botName: string;
      description: string;
      creatorId: string;
      createdAt: number;
      updatedAt: number;
      isActive: boolean;
    }>(`/api/bots/${botId}`, {
      method: 'GET',
    });
    return response;
  }

  async createBot(data: {
    botName: string;
    description?: string;
    creatorId: string;
    isActive?: boolean;
  }) {
    const response = await this.request<{
      botId: string;
      botName: string;
      description: string;
      creatorId: string;
      createdAt: number;
      updatedAt: number;
      isActive: boolean;
    }>('/api/bots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateBot(botId: string, data: {
    botName?: string;
    description?: string;
    isActive?: boolean;
  }) {
    const response = await this.request<{
      botId: string;
      botName: string;
      description: string;
      creatorId: string;
      createdAt: number;
      updatedAt: number;
      isActive: boolean;
    }>(`/api/bots/${botId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteBot(botId: string) {
    const response = await this.request<{
      message: string;
      botId: string;
    }>(`/api/bots/${botId}`, {
      method: 'DELETE',
    });
    return response;
  }
}

// APIクライアントのインスタンスをエクスポート
export const api = new ApiClient(API_BASE_URL); 