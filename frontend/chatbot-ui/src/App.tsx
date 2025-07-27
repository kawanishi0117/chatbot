import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ChatArea from './components/ChatArea';
import Header from './components/Header';

import BotSelectionModal from './components/BotSelectionModal';
import { LoadingOverlay, LoadingSpinner } from './components/loading';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import { AlertProvider, useAlert } from './contexts/AlertContext';
import { useAuth, useChat } from './hooks';
import { api } from './services/api';
import { Chat, Message } from './types';

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
  const location = useLocation();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  // Custom hooks
  const {
    authState,
    isUserInfoLoading,
    checkAuth,
    handleLogin,
    handleLogout,
    handleAuthError,
    handleUserUpdate
  } = useAuth();

  const {
    chats,
    bots,
    isLoadingChats,
    setChats,
    loadBotsAndChats,
    loadChatMessages,
    handleSelectChat: selectChat,
    handleDeleteChat: deleteChat,
    createChatRoom,
    addChatFromApi,
    handleInvalidChatId
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // 新しいボット選択モーダル関連の状態
  const [isBotSelectionModalOpen, setIsBotSelectionModalOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // URLから現在のチャットIDを取得
  const getCurrentChatId = (): string | null => {
    const path = location.pathname;
    const match = path.match(/^\/chat\/(.+)$/);
    return match ? match[1] : null;
  };

  const currentChatId = getCurrentChatId();

  // 現在のチャットを取得
  const currentChat = chats.find(chat => chat.id === currentChatId) || null;

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
      const newChat = await createChatRoom(botId, '新しいチャット');
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
    let cleanup: (() => void) | undefined;
    
    const performAuthCheck = async () => {
      cleanup = await checkAuth(loadBotsAndChats);
    };
    
    performAuthCheck();
    
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []); // 依存配列を空にして初回のみ実行

  // ログイン処理（カスタムフックのhandleLoginを使用）
  const onLogin = async (email: string, password: string) => {
    await handleLogin(loadBotsAndChats);
  };

  // チャット選択（カスタムフックを使用）
  const handleSelectChat = (chatId: string) => {
    selectChat(chatId, setIsSidebarOpen);
  };

  // チャット削除（カスタムフックを使用）
  const handleDeleteChat = async (deleteChatId: string) => {
    await deleteChat(deleteChatId, handleAuthError);
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
        updatedAt: new Date(),
        messagesLoaded: true // メッセージが既に追加されているので読み込み済み
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

    try {
      // 実際のAPI呼び出し
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
    } catch (error: unknown) {
      console.error('Failed to send message:', error);
      
      const errorResponse = error as { status?: number };
      // 認証エラーの場合はログアウト
      if (errorResponse.status === 401) {
        handleAuthError();
        return;
      }
      
      // 404エラー（チャットが存在しない）の場合はトップページにリダイレクト
      if (errorResponse.status === 404) {
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
    }
  };

  // チャット詳細ページ用のコンポーネント
  const ChatRoute = () => {
    const chat = currentChat;
    const [isValidating, setIsValidating] = useState(false);
    const [showNoChatMessage, setShowNoChatMessage] = useState(false);

    // 存在しないチャットIDの場合はエラー表示またはトップページにリダイレクト
    useEffect(() => {
      const validateChatId = async () => {
        if (!currentChatId) return;
        
        // ローカルのチャット一覧に存在するかチェック
        if (chats.length > 0 && !chat) {
          // チャット一覧が読み込まれているのに該当チャットが見つからない場合
          setIsValidating(true);
          setShowNoChatMessage(false);
          
          try {
            // APIでチャットの存在確認
            const exists = await api.checkChatExists(currentChatId);
            if (!exists) {
              console.warn(`チャットルームが見つかりません: ${currentChatId}`);
              setShowNoChatMessage(true);
              return;
            }
            
            // チャットが存在する場合は情報を取得
            const success = await addChatFromApi(currentChatId);
            if (success) {
              setShowNoChatMessage(false);
            }
            
          } catch (error: unknown) {
            console.error('チャット存在確認エラー:', error);
            const errorResponse = error as { status?: number };
            if (errorResponse.status === 401) {
              handleAuthError();
            } else if (errorResponse.status === 404) {
              console.warn(`チャットルームが見つかりません (API): ${currentChatId}`);
              setShowNoChatMessage(true);
            } else {
              // その他のエラーの場合もチャットルーム未作成として扱う
              setShowNoChatMessage(true);
            }
          } finally {
            setIsValidating(false);
          }
        } else if (chats.length > 0 && chat) {
          // チャットが見つかった場合はエラー表示をリセット
          setShowNoChatMessage(false);
          
          // チャットのメッセージが未読み込みの場合は取得
          if (!chat.messagesLoaded) {
            loadChatMessages(currentChatId);
          }
        }
      };

      validateChatId();
    }, [currentChatId, chat, chats.length, addChatFromApi, handleAuthError]);

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
          onStartNewChat={handleStartNewChat}
          showNoChatRoomMessage={showNoChatMessage}
          hasChats={chats.length > 0}
        />
      </div>
    );
  };

  // ホームページ用のコンポーネント
  const HomeRoute = () => {
    // ルートアクセス時の処理
    useEffect(() => {
      // チャット履歴がある場合は最新のチャットにリダイレクト
      if (chats.length > 0 && !isLoadingChats) {
        const latestChat = chats[0]; // chatsは新しい順にソートされている
        navigate(`/chat/${latestChat.id}`, { replace: true });
      }
    }, [chats, isLoadingChats]);

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatArea
          currentChat={null}
          onSendMessage={() => {}} // ルート画面では送信を無効化
          isTyping={isTyping}
          bots={bots}
          onStartNewChat={handleStartNewChat}
          hasChats={chats.length > 0}
        />
      </div>
    );
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
    return <Login onLogin={onLogin} />;
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
        isVisible={isCreatingChat}
        message="新しいチャットを作成中..."
        backdrop="dark"
        size="lg"
      />
      <LoadingOverlay
        isVisible={isLoadingChats}
        message="チャットを読み込み中..."
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
