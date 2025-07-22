import { useEffect, useState } from 'react';
import BotSettingsPanel from './components/BotSettingsPanel';
import GitHubPanel from './components/GitHubPanel';
import Header from './components/Header';
import Login from './components/Login';
import OverviewPanel from './components/OverviewPanel';
import S3Panel from './components/S3Panel';
import Sidebar from './components/Sidebar';
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

  const handleCreateChatbot = () => {
    const newChatbot: ChatbotConfig = {
      id: Date.now().toString(),
      name: `新しいチャットボット`,
      description: '新規作成されたチャットボット',
      githubRepo: '',
      s3Folder: '',
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setChatbots(prev => [...prev, newChatbot]);
    setSelectedChatbot(newChatbot);
    setCurrentView('overview');
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
    // ボット設定パネルは選択されたチャットボットに関係なく表示
    if (currentView === 'bot-settings') {
      return (
        <BotSettingsPanel
          currentUserId={authState.user?.id || 'anonymous'}
        />
      );
    }

    if (!selectedChatbot) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">チャットボットを選択してください</h2>
            <p>サイドバーからチャットボットを選択して設定を開始してください</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'overview':
        return (
          <OverviewPanel
            chatbot={selectedChatbot}
            onEdit={() => setCurrentView('github')}
            onToggleStatus={handleToggleChatbotStatus}
          />
        );
      case 'github':
        return (
          <GitHubPanel
            chatbot={selectedChatbot}
            onSave={handleSaveGitHubRepo}
          />
        );
      case 's3':
        return (
          <S3Panel
            chatbot={selectedChatbot}
            onSave={handleSaveS3Folder}
          />
        );
      case 'webhooks':
        return (
          <WebhookPanel
            chatbot={selectedChatbot}
            onSave={(webhooks) => console.log('Webhooks saved:', webhooks)}
          />
        );
      case 'users':
        return (
          <UserPanel
            chatbot={selectedChatbot}
            onSave={(userAccess) => console.log('User access saved:', userAccess)}
          />
        );
      case 'security':
        return (
          <div className="p-6 text-center text-gray-500">
            <h2 className="text-xl font-semibold mb-2">セキュリティ設定</h2>
            <p>このパネルは開発中です</p>
          </div>
        );
      default:
        return (
          <div className="p-6 text-center text-gray-500">
            <h2 className="text-xl font-semibold mb-2">不明なビュー</h2>
            <p>指定されたビューが見つかりません</p>
          </div>
        );
    }
  };

  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={authState.user}
        onLogout={handleLogout}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />
      
      <div className="flex pt-16">
        <Sidebar
          isOpen={isSidebarOpen}
          chatbots={chatbots}
          selectedChatbot={selectedChatbot}
          onSelectChatbot={handleSelectChatbot}
          onCreateChatbot={handleCreateChatbot}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        
        <main className="flex-1 lg:ml-80 transition-all duration-200 ease-in-out">
          <div className="max-w-7xl mx-auto">
            {renderCurrentView()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
