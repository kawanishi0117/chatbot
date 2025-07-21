import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import OverviewPanel from './components/OverviewPanel';
import GitHubPanel from './components/GitHubPanel';
import S3Panel from './components/S3Panel';
import WebhookPanel from './components/WebhookPanel';
import UserPanel from './components/UserPanel';
import { AuthState, ChatbotConfig } from './types';

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false
  });

  const [chatbots, setChatbots] = useState<ChatbotConfig[]>([]);
  const [selectedChatbot, setSelectedChatbot] = useState<ChatbotConfig | null>(null);
  const [currentView, setCurrentView] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // デモ用のチャットボットデータを初期化
  useEffect(() => {
    if (authState.isAuthenticated && chatbots.length === 0) {
      const mockChatbots: ChatbotConfig[] = [
        {
          id: '1',
          name: 'カスタマーサポートボット',
          description: '製品に関する質問に答えるチャットボット',
          githubRepo: 'company/customer-support-docs',
          s3Folder: 's3://chatbot-bucket/customer-support/',
          isActive: true,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          name: 'API ドキュメンテーションボット',
          description: 'API仕様に関する質問に答えるチャットボット',
          githubRepo: 'company/api-documentation',
          s3Folder: 's3://chatbot-bucket/api-docs/',
          isActive: false,
          createdAt: '2024-01-14T16:20:00Z',
          updatedAt: '2024-01-14T16:20:00Z'
        },
        {
          id: '3',
          name: '社内ナレッジボット',
          description: '社内文書とFAQに基づくチャットボット',
          githubRepo: '',
          s3Folder: 's3://chatbot-bucket/internal-docs/',
          isActive: true,
          createdAt: '2024-01-13T09:15:00Z',
          updatedAt: '2024-01-13T09:15:00Z'
        }
      ];
      setChatbots(mockChatbots);
      setSelectedChatbot(mockChatbots[0]);
    }
  }, [authState.isAuthenticated, chatbots.length]);

  const handleLogin = (email: string, password: string) => {
    // デモ用のログイン処理
    setAuthState({
      user: {
        id: '1',
        email,
        name: email.split('@')[0],
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isAuthenticated: true,
      isLoading: false
    });
  };

  const handleLogout = () => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
    setSelectedChatbot(null);
    setCurrentView('overview');
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
