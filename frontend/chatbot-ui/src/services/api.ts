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
        
        // HTTPステータスコードに基づいてエラーメッセージを詳細化
        let errorMessage = error.message || `HTTP error! status: ${response.status}`;
        
        switch (response.status) {
          case 401:
            errorMessage = '認証が必要です。再度ログインしてください。';
            // 認証エラーの場合はトークンを削除
            removeToken();
            break;
          case 403:
            errorMessage = 'アクセス権限がありません。';
            break;
          case 404:
            errorMessage = '指定されたリソースが見つかりません。';
            break;
          case 500:
            errorMessage = 'サーバーエラーが発生しました。しばらく後にお試しください。';
            break;
          default:
            // その他のエラーはレスポンスメッセージを使用
            break;
        }
        
        const customError = new Error(errorMessage);
        (customError as any).status = response.status;
        (customError as any).originalMessage = error.message;
        throw customError;
      }
      return response.json();
    }).finally(() => {
      // リクエスト完了後にキャッシュから削除
      this.requestCache.delete(requestKey);
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

  // ボット一覧API
  async getBots() {
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
    }>('/api/bots', {
      method: 'GET',
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

  // チャットルーム管理API
  async createChatRoom(botId: string, title?: string) {
    const response = await this.request<{
      chatId: string;
      title: string;
      botId: string;
      botName: string;
      createdAt: number;
    }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({
        botId,
        title: title || '新しいチャット',
      }),
    });
    return response;
  }

  async getUserChats() {
    const response = await this.request<{
      chats: Array<{
        chatId: string;
        title: string;
        botId: string;
        botName: string;
        createdAt: number;
        updatedAt: number;
        messageCount: number;
        lastMessage: string;
      }>;
      count: number;
    }>('/api/chats', {
      method: 'GET',
    });
    return response;
  }

  async getChatRoom(chatId: string) {
    const response = await this.request<{
      chatId: string;
      title: string;
      botId: string;
      botName: string;
      createdAt: number;
      updatedAt: number;
      messageCount: number;
      lastMessage: string;
    }>(`/api/chats/${chatId}`, {
      method: 'GET',
    });
    return response;
  }

  // チャットルームの存在確認
  async checkChatExists(chatId: string): Promise<boolean> {
    try {
      await this.getChatRoom(chatId);
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error; // その他のエラーは再スロー
    }
  }

  async deleteChatRoom(chatId: string) {
    const response = await this.request<{
      message: string;
    }>(`/api/chats/${chatId}`, {
      method: 'DELETE',
    });
    return response;
  }

  async getChatMessages(chatId: string) {
    const response = await this.request<{
      chatId: string;
      messages: Array<{
        id: string;
        content: string;
        role: 'user' | 'assistant';
        timestamp: string;
      }>;
      count: number;
    }>(`/api/chats/${chatId}/messages`, {
      method: 'GET',
    });
    return response;
  }


}

// APIクライアントのインスタンスをエクスポート
export const api = new ApiClient(API_BASE_URL); 