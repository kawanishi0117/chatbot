import { useEffect, useState } from 'react';
import BotList from './components/BotList'; // Added BotList import
import GitHubPanel from './components/GitHubPanel';
import Header from './components/Header';
import { LoadingSpinner } from './components/loading';
import Login from './components/Login';
import OverviewPanel from './components/OverviewPanel';
import S3Panel from './components/S3Panel';
import Sidebar from './components/Sidebar';
import SimpleBotForm from './components/SimpleBotForm';
import UserPanel from './components/UserPanel';
import WebhookPanel from './components/WebhookPanel';
import { api, getToken } from './services/api';
import { AuthState, ChatbotConfig } from './types';

function App() {
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
        }
      }
    };
    
    fetchBots();
  }, [authState.isAuthenticated, authState.user]);

  const handleLogin = async (_email: string, _password: string) => {
    // Login コンポーネント内で既にAPIを呼び出しているので、
    // ここではユーザー情報を再取得
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
    try {
      const response = await api.createBot({
        botName: botData.name,
        description: botData.description
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
      alert('ボットの作成に失敗しました');
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
        <div className="h-full flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">新しいボットを作成</h1>
            <SimpleBotForm
              onSave={handleSaveNewChatbot}
              onCancel={() => setIsCreatingBot(false)}
            />
          </div>
        </div>
      );
    }

    // ボットが選択されていない場合はボット一覧を表示
    if (!selectedChatbot) {
      return (
        <div className="h-full">
          <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">マイボット</h1>
              <p className="text-gray-600">作成したチャットボットの一覧です</p>
            </div>
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
              loading={false}
              onEdit={(bot) => {
                const chatbot = chatbots.find(c => c.id === bot.botId);
                if (chatbot) {
                  setSelectedChatbot(chatbot);
                  setCurrentView('overview');
                }
              }}
              onDelete={async (bot) => {
                if (confirm(`「${bot.botName}」を削除しますか？この操作は取り消せません。`)) {
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
                    if (selectedChatbot?.id === bot.botId) {
                      setSelectedChatbot(null);
                    }
                  } catch (error) {
                    console.error('Failed to delete bot:', error);
                    alert('ボットの削除に失敗しました');
                  }
                }
              }}
              onRefresh={async () => {
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
    </div>
  );
}

export default App;
