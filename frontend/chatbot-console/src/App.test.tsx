import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { api } from './services/api';

// APIモックを作成
jest.mock('./services/api', () => ({
  api: {
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
    getBots: jest.fn(),
  },
  getToken: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockGetToken = require('./services/api').getToken as jest.MockedFunction<typeof import('./services/api').getToken>;

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトでトークンなしの状態
    mockGetToken.mockReturnValue(null);
  });

  test('renders login screen when not authenticated', () => {
    render(<App />);
    expect(screen.getByText('ChatBot Console')).toBeInTheDocument();
    expect(screen.getByText('管理者用コンソールにログイン')).toBeInTheDocument();
  });

  test('prevents duplicate API calls on mount with StrictMode', async () => {
    // トークンが存在する状態をモック
    mockGetToken.mockReturnValue('mock-token');
    mockApi.getCurrentUser.mockResolvedValue({
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockApi.getBots.mockResolvedValue({
      bots: []
    });

    // React.StrictModeの動作をシミュレートするため、コンポーネントを2回レンダリング
    const { unmount } = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // APIが呼ばれるまで待機
    await waitFor(() => {
      expect(mockApi.getCurrentUser).toHaveBeenCalled();
    });

    // StrictModeでも1回だけ呼ばれることを確認
    expect(mockApi.getCurrentUser).toHaveBeenCalledTimes(1);

    unmount();
  });

  test('handles authentication check failure gracefully', async () => {
    mockGetToken.mockReturnValue('invalid-token');
    mockApi.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
    mockApi.logout.mockResolvedValue(undefined);

    render(<App />);

    await waitFor(() => {
      expect(mockApi.getCurrentUser).toHaveBeenCalled();
    });

    expect(mockApi.logout).toHaveBeenCalled();
    expect(screen.getByText('ChatBot Console')).toBeInTheDocument();
  });

  test('does not make API call when no token exists', async () => {
    mockGetToken.mockReturnValue(null);

    render(<App />);

    // 少し待ってからAPIが呼ばれていないことを確認
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockApi.getCurrentUser).not.toHaveBeenCalled();
    expect(screen.getByText('ChatBot Console')).toBeInTheDocument();
  });
});
