import { useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ChatArea from './components/ChatArea';
import Header from './components/Header';

import BotSelectionModal from './components/BotSelectionModal';
import { LoadingOverlay, LoadingSpinner } from './components/loading';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import { AlertProvider, useAlert } from './contexts/AlertContext';
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

function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useAlert();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  const [chats, setChats] = useState<Chat[]>([]);
  const [bots, setBots] = useState<Array<{
    botId: string;
    botName: string;
    description: string;
    isActive: boolean;
  }>>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isUserInfoLoading, setIsUserInfoLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // 新しいボット選択モーダル関連の状態
  const [isBotSelectionModalOpen, setIsBotSelectionModalOpen] = useState(false);
  const [isBotsLoading, setIsBotsLoading] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // URLから現在のチャットIDを取得
  const getCurrentChatId = (): string | null => {
    const path = location.pathname;
    const match = path.match(/^\/chat\/(.+)$/);
    return match ? match[1] : null;
  };

  const currentChatId = getCurrentChatId();

  // 認証チェックの重複実行を防ぐためのref
  const authCheckInProgress = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 現在のチャットを取得
  const currentChat = chats.find(chat => chat.id === currentChatId) || null;

  // ユーザー情報更新処理
  const handleUserUpdate = (updatedUser: any) => {
    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }));
  };

  // ボット一覧とチャット一覧を読み込む
  const loadBotsAndChats = async (isMounted: boolean, signal?: AbortSignal) => {
    try {
      setIsLoadingChats(true);
      
      // ボット一覧を取得
      const botsResponse = await api.getBots();
      if (isMounted && !signal?.aborted) {
        setBots(botsResponse.bots.filter(bot => bot.isActive));
      }

      // チャット一覧を取得
      const chatsResponse = await api.getUserChats();
      if (isMounted && !signal?.aborted) {
        const formattedChats: Chat[] = chatsResponse.chats.map(chat => ({
          id: chat.chatId,
          title: chat.title,
          messages: [], // メッセージは後で必要に応じて取得
          createdAt: new Date(chat.createdAt * 1000),
          updatedAt: new Date(chat.updatedAt * 1000),
          botId: chat.botId
        }));
        setChats(formattedChats);
      }
    } catch (error) {
      console.error('Failed to load bots and chats:', error);
    } finally {
      if (isMounted && !signal?.aborted) {
        setIsLoadingChats(false);
      }
    }
  };

  // チャットのメッセージ履歴を取得
  const loadChatMessages = async (chatId: string) => {
    try {
      const messagesResponse = await api.getChatMessages(chatId);
      const formattedMessages: Message[] = messagesResponse.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.timestamp)
      }));

      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, messages: formattedMessages }
          : chat
      ));
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  };

  // サイドバートグル処理
  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // 新しいチャット開始ボタンクリック（ボット選択モーダルを開く）
  const handleStartNewChat = () => {
    setIsBotSelectionModalOpen(true);
  };

  // ボット選択モーダルでのボット選択
  const handleBotSelection = async (botId: string) => {
    setIsCreatingChat(true);
    try {
      // バックエンドAPIでチャットルームを作成
      const response = await api.createChatRoom(botId, '新しいチャット');
      
      const newChat: Chat = {
        id: response.chatId,
        title: response.title,
        messages: [],
        createdAt: new Date(response.createdAt * 1000),
        updatedAt: new Date(response.createdAt * 1000),
        botId: response.botId
      };
      
      setChats(prev => [newChat, ...prev]);
      navigate(`/chat/${newChat.id}`);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error('チャットルームの作成に失敗しました:', error);
      // エラー時は適切なアラートを表示
      await showAlert(
        'チャットルームの作成に失敗しました。しばらく後にお試しください。',
        'error',
        'エラー'
      );
    } finally {
      setIsCreatingChat(false);
    }
  };

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

            // ユーザー認証成功後にボット一覧とチャット一覧を取得
            await loadBotsAndChats(isMounted, abortControllerRef.current?.signal)
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
      navigate('/');
    }
  };

  // チャット選択
  const handleSelectChat = (chatId: string) => {
    navigate(`/chat/${chatId}`);
    setIsSidebarOpen(false);
    
    // チャットのメッセージが未読み込みの場合は取得
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat && selectedChat.messages.length === 0) {
      loadChatMessages(chatId);
    }
  };

  // チャット削除
  const handleDeleteChat = (deleteChatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== deleteChatId));
    if (currentChatId === deleteChatId) {
      navigate('/');
    }
  };

  // 存在しないチャットIDの処理
  const handleInvalidChatId = (chatId: string) => {
    console.warn(`存在しないチャットID: ${chatId}`);
    navigate('/');
  };

  // 認証エラー処理
  const handleAuthError = () => {
    console.warn('認証エラーが発生しました。ログアウトします。');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
    setChats([]);
    navigate('/');
  };

  // メッセージ送信
  const handleSendMessage = async (content: string) => {
    let targetChatId: string;

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    };

    if (!currentChatId) {
      // 新しいチャットを作成
      const newChatId = Date.now().toString();
      targetChatId = newChatId;
      
      const newChat: Chat = {
        id: newChatId,
        title: content.length > 30 ? content.substring(0, 30) + '...' : content,
        messages: [userMessage],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setChats(prev => [newChat, ...prev]);
      navigate(`/chat/${newChatId}`);
    } else {
      // 既存のチャットにメッセージを追加
      targetChatId = currentChatId;
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
    }

    // タイピングインジケーター表示とオーバーレイローディング開始
    setIsTyping(true);
    setIsSendingMessage(true);

    try {
      // チャットのボットIDを取得
      const targetChat = chats.find(chat => chat.id === targetChatId);
      const botId = targetChat?.botId;

      // 実際のAPI呼び出し（ボットIDを含む）
      const response = await api.sendMessage(content, targetChatId);
      
      // AI応答をチャットに追加
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message || generateAIResponse(content),
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
    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      // 認証エラーの場合はログアウト
      if (error.status === 401) {
        handleAuthError();
        return;
      }
      
      // 404エラー（チャットが存在しない）の場合はトップページにリダイレクト
      if (error.status === 404) {
        console.warn(`チャットが存在しません: ${targetChatId}`);
        handleInvalidChatId(targetChatId);
        return;
      }
      
      // その他のエラーの場合はデモ応答を使用
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(content),
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
    } finally {
      setIsTyping(false);
      setIsSendingMessage(false);
    }
  };

  // チャット詳細ページ用のコンポーネント
  const ChatRoute = () => {
    const chat = currentChat;
    const [isValidating, setIsValidating] = useState(false);

    // 存在しないチャットIDの場合はトップページにリダイレクト
    useEffect(() => {
      const validateChatId = async () => {
        if (!currentChatId) return;
        
        // ローカルのチャット一覧に存在するかチェック
        if (chats.length > 0 && !chat) {
          // チャット一覧が読み込まれているのに該当チャットが見つからない場合
          setIsValidating(true);
          try {
            // APIでチャットの存在確認
            const exists = await api.checkChatExists(currentChatId);
            if (!exists) {
              handleInvalidChatId(currentChatId);
              return;
            }
            // チャットが存在する場合は情報を取得
            const chatInfo = await api.getChatRoom(currentChatId);
            const newChat: Chat = {
              id: chatInfo.chatId,
              title: chatInfo.title,
              messages: [], // メッセージは別途取得
              createdAt: new Date(chatInfo.createdAt * 1000),
              updatedAt: new Date(chatInfo.updatedAt * 1000),
              botId: chatInfo.botId
            };
            setChats(prev => [newChat, ...prev.filter(c => c.id !== currentChatId)]);
          } catch (error: any) {
            console.error('チャット存在確認エラー:', error);
            if (error.status === 401) {
              handleAuthError();
            } else if (error.status === 404) {
              handleInvalidChatId(currentChatId);
            }
          } finally {
            setIsValidating(false);
          }
        }
      };

      validateChatId();
    }, [currentChatId, chat, chats.length]); // chats.lengthに変更してループを防止

    // チャット存在確認中の表示
    if (isValidating) {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">チャットを確認中...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatArea
          currentChat={chat}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          bots={bots}
        />
      </div>
    );
  };

  // ホームページ用のコンポーネント
  const HomeRoute = () => {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatArea
          currentChat={null}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          bots={bots}
        />
      </div>
    );
  };

  // 404エラーページ用のコンポーネント
  const NotFoundRoute = () => {
    useEffect(() => {
      // 存在しないパスにアクセスした場合はトップページにリダイレクト
      navigate('/', { replace: true });
    }, [navigate]);

    return null;
  };

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
          onCreateChat={handleStartNewChat}
          onDeleteChat={handleDeleteChat}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* メインエリア */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {location.pathname === '/' ? <HomeRoute /> : <ChatRoute />}
        </main>
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
      <LoadingOverlay
        isVisible={isCreatingChat}
        message="新しいチャットを作成中..."
        backdrop="dark"
        size="lg"
      />
      <LoadingOverlay
        isVisible={isLoadingChats}
        message="ボット一覧とチャット一覧を読み込み中..."
        backdrop="dark"
        size="lg"
      />

      {/* ボット選択モーダル */}
      <BotSelectionModal
        isOpen={isBotSelectionModalOpen}
        bots={bots}
        isLoading={isLoadingChats}
        onSelectBot={handleBotSelection}
        onClose={() => setIsBotSelectionModalOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <AlertProvider>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/chat/:chatId" element={<MainApp />} />
        {/* 存在しないパスは全てトップページにリダイレクト */}
        <Route path="*" element={<MainApp />} />
      </Routes>
    </AlertProvider>
  );
}

export default App;
