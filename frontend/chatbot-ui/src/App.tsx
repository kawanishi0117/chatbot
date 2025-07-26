import { useEffect, useRef, useState } from 'react';
import ChatArea from './components/ChatArea';
import Header from './components/Header';
import { LoadingOverlay, LoadingSpinner } from './components/loading';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import { AlertProvider } from './contexts/AlertContext';
import { api, getToken } from './services/api';
import { AuthState, Chat, Message } from './types';

// デモ用のAI応答生成関数
const generateAIResponse = (userMessage: string): string => {
  const responses = [
    "とても興味深い質問ですね。詳しく教えていただけますか？",
    "なるほど、それについて説明させていただきます。",
    "その件についていくつかの選択肢があります。",
    "参考になりそうな情報をお伝えします。",
    "もう少し具体的に教えていただけると、より詳細にお答えできます。",
    "それは重要なポイントですね。考慮すべき要素がいくつかあります。"
  ];
  
  // 簡単なキーワードベースの応答
  if (userMessage.includes('天気')) {
    return "申し訳ございませんが、現在の天気情報を取得することができません。気象庁のサイトや天気アプリをご確認ください。";
  }
  
  if (userMessage.includes('JavaScript') || userMessage.includes('プログラミング')) {
    return "JavaScriptは非常に人気のあるプログラミング言語です。ウェブ開発において重要な役割を果たしており、フロントエンドからバックエンドまで幅広く使用されています。具体的にどの部分について知りたいですか？";
  }
  
  if (userMessage.includes('レシピ') || userMessage.includes('料理')) {
    return "料理に関するご質問ですね！具体的にどのような料理のレシピをお探しでしょうか？和食、洋食、中華料理など、ジャンルを教えていただけると、より具体的なご提案ができます。";
  }
  
  if (userMessage.includes('勉強') || userMessage.includes('学習')) {
    return "効率的な学習方法について説明しますね。まず、目標を明確にすること、計画的に進めること、アクティブラーニングを取り入れることが重要です。具体的にどの分野の学習についてご相談でしょうか？";
  }
  
  return responses[Math.floor(Math.random() * responses.length)];
};

function AppContent() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isUserInfoLoading, setIsUserInfoLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // 認証チェックの重複実行を防ぐためのref
  const authCheckInProgress = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 現在のチャットを取得
  const currentChat = chats.find(chat => chat.id === currentChatId) || null;

  // 初期化時にトークンをチェック
  useEffect(() => {
    let isMounted = true; // マウント状態の追跡
    
    const checkAuth = async () => {
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
          }
        } catch (error) {
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
    };
    
    checkAuth();

    // クリーンアップ関数
    return () => {
      isMounted = false; // アンマウント時にフラグを無効化
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      authCheckInProgress.current = false;
    };
  }, []);

  // ログイン処理
  const handleLogin = async (_email: string, _password: string) => {
    // Login コンポーネント内で既にAPIを呼び出しているので、
    // ここではユーザー情報を再取得せずに、ログイン成功を処理
    setIsUserInfoLoading(true);
    try {
      // ログイン後は認証チェックの重複を防ぐためにフラグをリセット
      authCheckInProgress.current = false;
      
      // トークンが既に設定されているはずなので、ユーザー情報を取得
      // ただし、重複チェックを避けるため、既に進行中でないことを確認
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
  };

  // ログアウト処理
  const handleLogout = async () => {
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
      setChats([]);
      setCurrentChatId(null);
    }
  };

  // 新しいチャット作成
  const handleCreateChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: '新しいチャット',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setIsSidebarOpen(false);
  };

  // チャット選択
  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setIsSidebarOpen(false);
  };

  // チャット削除
  const handleDeleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  };

  // メッセージ送信
  const handleSendMessage = async (content: string) => {
    if (!currentChatId) {
      // 新しいチャットを作成
      const newChat: Chat = {
        id: Date.now().toString(),
        title: content.length > 30 ? content.substring(0, 30) + '...' : content,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
    }

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    };

    const targetChatId = currentChatId || Date.now().toString();
    
    setChats(prev => prev.map(chat => 
      chat.id === targetChatId 
        ? {
            ...chat,
            messages: [...chat.messages, userMessage],
            updatedAt: new Date(),
            title: chat.messages.length === 0 ? 
              (content.length > 30 ? content.substring(0, 30) + '...' : content) : 
              chat.title
          }
        : chat
    ));

    // タイピングインジケーター表示とオーバーレイローディング開始
    setIsTyping(true);
    setIsSendingMessage(true);

    try {
      // 実際のAPI呼び出し
      const response = await api.sendMessage(content, targetChatId);
      
      // AI応答をチャットに追加
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message || generateAIResponse(content), // APIレスポンスまたはフォールバック
        role: 'assistant',
        timestamp: new Date()
      };

      setChats(prev => prev.map(chat => 
        chat.id === targetChatId 
          ? {
              ...chat,
              messages: [...chat.messages, aiMessage],
              updatedAt: new Date()
            }
          : chat
      ));
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // エラー時のフォールバック応答
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '申し訳ございません。メッセージの送信に失敗しました。もう一度お試しください。',
        role: 'assistant',
        timestamp: new Date()
      };

      setChats(prev => prev.map(chat => 
        chat.id === targetChatId 
          ? {
              ...chat,
              messages: [...chat.messages, errorMessage],
              updatedAt: new Date()
            }
          : chat
      ));
    } finally {
      setIsTyping(false);
      setIsSendingMessage(false);
    }
  };

  // ユーザー情報更新処理
  const handleUserUpdate = (updatedUser: any) => {
    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }));
  };

  // サイドバートグル
  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // ローディング中の表示
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="xl" color="primary" />
      </div>
    );
  }

  // ログインしていない場合はログイン画面を表示
  if (!authState.isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ヘッダー */}
      <Header
        user={authState.user!}
        onLogout={handleLogout}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onUserUpdate={handleUserUpdate}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* サイドバー */}
        <Sidebar
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onCreateChat={handleCreateChat}
          onDeleteChat={handleDeleteChat}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* チャットエリア */}
        <ChatArea
          currentChat={currentChat}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
        />
      </div>

      {/* Loading Overlays */}
      <LoadingOverlay
        isVisible={isUserInfoLoading}
        message="ユーザー情報を取得中..."
        backdrop="dark"
        size="lg"
      />
      <LoadingOverlay
        isVisible={isSendingMessage}
        message="メッセージを送信中..."
        backdrop="dark"
        size="lg"
      />
    </div>
  );
}

function App() {
  return (
    <AlertProvider>
      <AppContent />
    </AlertProvider>
  );
}

export default App;
