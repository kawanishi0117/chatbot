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

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
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
    }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  // チャット用Webhook API
  async sendMessage(message: string, roomId: string) {
    const response = await this.request<{
      status: string;
      message: string;
    }>('/webhook/custom', {
      method: 'POST',
      body: JSON.stringify({
        roomId,
        userId: 'user',
        message: {
          text: message,
          timestamp: new Date().toISOString(),
        },
      }),
    });
    return response;
  }
}

// APIクライアントのインスタンスをエクスポート
export const api = new ApiClient(API_BASE_URL); 