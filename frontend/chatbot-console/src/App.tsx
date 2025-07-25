import { useEffect, useState } from 'react';
import BotList from './components/BotList'; // Added BotList import
import GitHubPanel from './components/GitHubPanel';
import Header from './components/Header';
import { LoadingOverlay, LoadingSpinner } from './components/loading';
import Login from './components/Login';
import OverviewPanel from './components/OverviewPanel';
import S3Panel from './components/S3Panel';
import Sidebar from './components/Sidebar';
import SimpleBotForm from './components/SimpleBotForm';
import UserPanel from './components/UserPanel';
import WebhookPanel from './components/WebhookPanel';
import { AlertProvider, useAlert } from './contexts/AlertContext';
import { api, getToken } from './services/api';
import { AuthState, ChatbotConfig } from './types';

function AppContent() {
  const { showAlert, showConfirm } = useAlert();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  const [chatbots, setChatbots] = useState<ChatbotConfig[]>([]);
  const [selectedChatbot, setSelectedChatbot] = useState<ChatbotConfig | null>(null);
  const [currentView, setCurrentView] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [isUserInfoLoading, setIsUserInfoLoading] = useState(false);
  const [isSavingBot, setIsSavingBot] = useState(false);
  const [isLoadingBots, setIsLoadingBots] = useState(false);
  const [isDeletingBot, setIsDeletingBot] = useState(false);

  // 初期化時にトークンをチェック
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const user = await api.getCurrentUser();
          setAuthState({
            user: {
              id: user.userId,
              email: user.email,
              name: user.name,
              role: user.role as 'user' | 'admin',
              createdAt: new Date(user.createdAt).toISOString(),
              updatedAt: new Date(user.updatedAt).toISOString()
            },
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          // トークンが無効な場合
          api.logout();
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    };
    
    checkAuth();
  }, []);

  // チャットボットデータを取得
  useEffect(() => {
    const fetchBots = async () => {
      if (authState.isAuthenticated && authState.user) {
        setIsLoadingBots(true);
        try {
          const response = await api.getBots();
          const botList = response.bots.map(bot => ({
            id: bot.botId,
            name: bot.botName,
            description: bot.description,
            githubRepo: '',  // これらは別途管理
            s3Folder: '',
            isActive: bot.isActive,
            createdAt: new Date(bot.createdAt).toISOString(),
            updatedAt: new Date(bot.updatedAt).toISOString()
          }));
          setChatbots(botList);
          if (botList.length > 0) {
            setSelectedChatbot(botList[0]);
          }
        } catch (error) {
          console.error('Failed to fetch bots:', error);
        } finally {
          setIsLoadingBots(false);
        }
      }
    };
    
    fetchBots();
  }, [authState.isAuthenticated, authState.user]);

  const handleLogin = async (_email: string, _password: string) => {
    // Login コンポーネント内で既にAPIを呼び出しているので、
    // ここではユーザー情報を再取得
    setIsUserInfoLoading(true);
    try {
      const user = await api.getCurrentUser();
      setAuthState({
        user: {
          id: user.userId,
          email: user.email,
          name: user.name,
          role: user.role as 'user' | 'admin',
          createdAt: new Date(user.createdAt).toISOString(),
          updatedAt: new Date(user.updatedAt).toISOString()
        },
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to get user info:', error);
    } finally {
      setIsUserInfoLoading(false);
    }
  };

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
      setChatbots([]);
      setSelectedChatbot(null);
      setCurrentView('overview');
    }
  };

  // ユーザー情報更新処理
  const handleUserUpdate = (updatedUser: any) => {
    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }));
  };

  const handleSelectChatbot = (chatbot: ChatbotConfig | null) => {
    setSelectedChatbot(chatbot);
    setCurrentView('overview');
    setIsSidebarOpen(false);
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // 新しいチャットボット作成
  const handleCreateChatbot = () => {
    setIsCreatingBot(true);
  };

  // チャットボット作成の保存処理
  const handleSaveNewChatbot = async (botData: { name: string; description: string }) => {
    setIsSavingBot(true);
    try {
      const response = await api.createBot({
        botName: botData.name,
        description: botData.description,
        creatorId: authState.user?.id || ''
      });
      
      if (response.botId) {
        // ボットリストを更新
        const newBot: ChatbotConfig = {
          id: response.botId,
          name: response.botName,
          description: response.description,
          githubRepo: '',
          s3Folder: '',
          isActive: response.isActive,
          createdAt: new Date(response.createdAt).toISOString(),
          updatedAt: new Date(response.updatedAt).toISOString()
        };
        
        setChatbots(prev => [newBot, ...prev]);
        setSelectedChatbot(newBot);
        setCurrentView('overview');
        setIsCreatingBot(false);
      }
    } catch (error) {
      console.error('Failed to create bot:', error);
      await showAlert('ボットの作成に失敗しました', 'error');
    } finally {
      setIsSavingBot(false);
    }
  };

  const handleUpdateChatbot = (updates: Partial<ChatbotConfig>) => {
    if (!selectedChatbot) return;
    
    const updatedChatbot = {
      ...selectedChatbot,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    setChatbots(prev => 
      prev.map(bot => bot.id === selectedChatbot.id ? updatedChatbot : bot)
    );
    setSelectedChatbot(updatedChatbot);
  };

  const handleToggleChatbotStatus = () => {
    if (!selectedChatbot) return;
    handleUpdateChatbot({ isActive: !selectedChatbot.isActive });
  };

  const handleSaveGitHubRepo = (githubRepo: string) => {
    handleUpdateChatbot({ githubRepo });
  };

  const handleSaveS3Folder = (s3Folder: string) => {
    handleUpdateChatbot({ s3Folder });
  };

  const renderCurrentView = () => {
    // ボット作成フォームを表示
    if (isCreatingBot) {
      return (
        <div className="h-full">
          <SimpleBotForm
            onCancel={() => setIsCreatingBot(false)}
            onSave={handleSaveNewChatbot}
          />
        </div>
      );
    }

    // ボット一覧を表示（ボットが選択されていない場合やボット一覧ビューの場合）
    if (!selectedChatbot || currentView === 'bots') {
      return (
        <div className="h-full">
          <div className="max-w-6xl mx-auto px-8 py-8">
            <BotList
              bots={chatbots.map(bot => ({
                botId: bot.id,
                botName: bot.name,
                description: bot.description,
                isActive: bot.isActive,
                creatorId: authState.user?.id || '',
                createdAt: new Date(bot.createdAt).getTime(),
                updatedAt: new Date(bot.updatedAt).getTime()
              }))}
              loading={isLoadingBots}
              onEdit={(bot) => {
                const chatbot = chatbots.find(c => c.id === bot.botId);
                if (chatbot) {
                  setSelectedChatbot(chatbot);
                  setCurrentView('overview');
                }
              }}
              onDelete={async (bot) => {
                const confirmed = await showConfirm(
                  `「${bot.botName}」を削除しますか？この操作は取り消せません。`,
                  'ボットの削除',
                  '削除する'
                );
                if (confirmed) {
                  const selectedBotId = (selectedChatbot as any)?.id;
                  setIsDeletingBot(true);
                  try {
                    await api.deleteBot(bot.botId);
                    // ボット削除後、リストを更新
                    const response = await api.getBots();
                    const botList = response.bots.map(b => ({
                      id: b.botId,
                      name: b.botName,
                      description: b.description,
                      githubRepo: '',
                      s3Folder: '',
                      isActive: b.isActive,
                      createdAt: new Date(b.createdAt).toISOString(),
                      updatedAt: new Date(b.updatedAt).toISOString()
                    }));
                    setChatbots(botList);
                    if (selectedBotId === bot.botId) {
                      setSelectedChatbot(null);
                    }
                  } catch (error) {
                    console.error('Failed to delete bot:', error);
                    await showAlert('ボットの削除に失敗しました', 'error');
                  } finally {
                    setIsDeletingBot(false);
                  }
                }
              }}
              onRefresh={async () => {
                setIsLoadingBots(true);
                try {
                  const response = await api.getBots();
                  const botList = response.bots.map(bot => ({
                    id: bot.botId,
                    name: bot.botName,
                    description: bot.description,
                    githubRepo: '',
                    s3Folder: '',
                    isActive: bot.isActive,
                    createdAt: new Date(bot.createdAt).toISOString(),
                    updatedAt: new Date(bot.updatedAt).toISOString()
                  }));
                  setChatbots(botList);
                } catch (error) {
                  console.error('Failed to refresh bots:', error);
                } finally {
                  setIsLoadingBots(false);
                }
              }}
            />
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'overview':
        return (
          <div className="h-full">
            <OverviewPanel
              chatbot={selectedChatbot}
              onEdit={() => setCurrentView('github')}
              onToggleStatus={handleToggleChatbotStatus}
            />
          </div>
        );
      case 'github':
        return (
          <div className="h-full">
            <GitHubPanel
              chatbot={selectedChatbot}
              onSave={handleSaveGitHubRepo}
            />
          </div>
        );
      case 's3':
        return (
          <div className="h-full">
            <S3Panel
              chatbot={selectedChatbot}
              onSave={handleSaveS3Folder}
            />
          </div>
        );
      case 'webhooks':
        return (
          <div className="h-full">
            <WebhookPanel
              chatbot={selectedChatbot}
              onSave={(webhooks) => console.log('Webhooks saved:', webhooks)}
            />
          </div>
        );
      case 'users':
        return (
          <div className="h-full">
            <UserPanel
              chatbot={selectedChatbot}
              onSave={(userAccess) => console.log('User access saved:', userAccess)}
            />
          </div>
        );
      case 'security':
        return (
          <div className="h-full p-6">
            <div className="text-center text-gray-500">
              <h2 className="text-xl font-semibold mb-2">セキュリティ設定</h2>
              <p>このパネルは開発中です</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="h-full p-6">
            <div className="text-center text-gray-500">
              <h2 className="text-xl font-semibold mb-2">不明なビュー</h2>
              <p>指定されたビューが見つかりません</p>
            </div>
          </div>
        );
    }
  };

  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="xl" color="primary" />
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header
        user={authState.user}
        onLogout={handleLogout}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onUserUpdate={handleUserUpdate}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          chatbots={chatbots}
          selectedChatbot={selectedChatbot}
          onSelectChatbot={handleSelectChatbot}
          onCreateChatbot={handleCreateChatbot}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        
        <main className="flex-1">
          <div className="h-full overflow-y-auto scrollbar-thin">
            {renderCurrentView()}
          </div>
        </main>
      </div>

      {/* Loading Overlays */}
      <LoadingOverlay
        isVisible={isSavingBot}
        message="ボットを作成中..."
        backdrop="dark"
        size="lg"
      />
      <LoadingOverlay
        isVisible={isLoadingBots}
        message="ボット一覧を読み込み中..."
        backdrop="dark"
        size="lg"
      />
      <LoadingOverlay
        isVisible={isDeletingBot}
        message="ボットを削除中..."
        backdrop="dark"
        size="lg"
      />
      <LoadingOverlay
        isVisible={isUserInfoLoading}
        message="ユーザー情報を取得中..."
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
