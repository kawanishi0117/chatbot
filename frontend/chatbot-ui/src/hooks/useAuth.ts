import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken } from '../services/api';
import { AuthState } from '../types';

export const useAuth = () => {
  const navigate = useNavigate();
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });
  
  const [isUserInfoLoading, setIsUserInfoLoading] = useState(false);
  
  // 認証チェックの重複実行を防ぐためのref
  const authCheckInProgress = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 認証チェック処理
  const checkAuth = useCallback(async (onSuccess?: (isMounted: boolean, signal?: AbortSignal) => Promise<void>) => {
    let isMounted = true;
    
    // 既に認証チェックが進行中の場合は何もしない
    if (authCheckInProgress.current) {
      return;
    }

    authCheckInProgress.current = true;
    
    // 前回のリクエストがあればキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 新しいAbortControllerを作成
    abortControllerRef.current = new AbortController();

    const token = getToken();
    if (token) {
      try {
        const user = await api.getCurrentUser();
        
        // コンポーネントがマウントされており、リクエストがキャンセルされていないかチェック
        if (isMounted && !abortControllerRef.current?.signal.aborted) {
          setAuthState({
            user: {
              id: user.userId,
              email: user.email,
              name: user.name
            },
            isAuthenticated: true,
            isLoading: false
          });

          // 認証成功後のコールバック実行
          if (onSuccess) {
            await onSuccess(isMounted, abortControllerRef.current?.signal);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // リクエストがキャンセルされた場合は何もしない
        if (abortControllerRef.current?.signal.aborted || !isMounted) {
          return;
        }
        
        // トークンが無効な場合
        api.logout();
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } else {
      if (isMounted) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    }
    
    authCheckInProgress.current = false;

    // クリーンアップ関数を返す
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      authCheckInProgress.current = false;
    };
  }, []);

  // ログイン処理
  const handleLogin = useCallback(async (loadBotsAndChats?: () => Promise<void>) => {
    setIsUserInfoLoading(true);
    try {
      // ログイン後は認証チェックの重複を防ぐためにフラグをリセット
      authCheckInProgress.current = false;
      
      // トークンが既に設定されているはずなので、ユーザー情報を取得
      if (!authCheckInProgress.current) {
        const user = await api.getCurrentUser();
        setAuthState({
          user: {
            id: user.userId,
            email: user.email,
            name: user.name
          },
          isAuthenticated: true,
          isLoading: false
        });

        // ログイン成功後にボット一覧とチャット一覧を読み込む
        if (loadBotsAndChats) {
          await loadBotsAndChats();
        }
      }
    } catch (error) {
      console.error('Failed to get user info:', error);
      // エラーの場合は認証状態をリセット
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    } finally {
      setIsUserInfoLoading(false);
    }
  }, []);

  // ログアウト処理
  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
      navigate('/');
    }
  }, [navigate]);

  // 認証エラー処理
  const handleAuthError = useCallback(() => {
    console.warn('認証エラーが発生しました。ログアウトします。');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
    navigate('/');
  }, [navigate]);

  // ユーザー情報更新処理
  const handleUserUpdate = useCallback((updatedUser: { id: string; email: string; name: string }) => {
    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }));
  }, []);

  return {
    authState,
    isUserInfoLoading,
    checkAuth,
    handleLogin,
    handleLogout,
    handleAuthError,
    handleUserUpdate
  };
};