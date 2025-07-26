import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
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
  const navigate = useNavigate();
  const location = useLocation();
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  const [chatbots, setChatbots] = useState<ChatbotConfig[]>([]);
  const [selectedChatbot, setSelectedChatbot] = useState<ChatbotConfig | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [isUserInfoLoading, setIsUserInfoLoading] = useState(false);
  const [isSavingBot, setIsSavingBot] = useState(false);
  const [isLoadingBots, setIsLoadingBots] = useState(false);
  const [isDeletingBot, setIsDeletingBot] = useState(false);

  // Get current view from URL path
  const getCurrentView = () => {
    const path = location.pathname;
    if (path === '/' || path === '/bots') return 'bots';
    if (path.includes('/overview')) return 'overview';
    if (path.includes('/github')) return 'github';
    if (path.includes('/s3')) return 's3';
    if (path.includes('/webhooks')) return 'webhooks';
    if (path.includes('/users')) return 'users';
    if (path.includes('/security')) return 'security';
    if (path === '/create') return 'create';
    return 'bots';
  };

  // 認証チェックの重複実行を防ぐためのref
  const authCheckInProgress = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
                name: user.name,
                role: user.role as 'user' | 'admin',
                createdAt: new Date(user.createdAt).toISOString(),
                updatedAt: new Date(user.updatedAt).toISOString()
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

  // チャットボットデータを取得
  useEffect(() => {
    let isMounted = true; // マウント状態の追跡
    let requestInProgress = false; // リクエスト進行状態の追跡
    
    const fetchBots = async () => {
      if (authState.isAuthenticated && authState.user && !requestInProgress) {
        requestInProgress = true;
        setIsLoadingBots(true);
        try {
          const response = await api.getBots();
          
          // コンポーネントがマウントされているかチェック
          if (isMounted) {
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
          }
        } catch (error) {
          if (isMounted) {
            console.error('Failed to fetch bots:', error);
          }
        } finally {
          if (isMounted) {
            setIsLoadingBots(false);
          }
          requestInProgress = false;
        }
      }
    };
    
    fetchBots();
    
    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, [authState.isAuthenticated, authState.user]);

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
            name: user.name,
            role: user.role as 'user' | 'admin',
            createdAt: new Date(user.createdAt).toISOString(),
            updatedAt: new Date(user.updatedAt).toISOString()
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
      navigate('/bots');
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
    if (chatbot) {
      navigate(`/bots/${chatbot.id}/overview`);
    } else {
      navigate('/bots');
    }
    setIsSidebarOpen(false);
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // 新しいチャットボット作成
  const handleCreateChatbot = () => {
    navigate('/create');
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
        navigate(`/bots/${response.botId}/overview`);
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

  // ボット詳細ページ用のコンポーネント
  const BotDetailRoute = ({ view }: { view: string }) => {
    const { botId } = useParams<{ botId: string }>();
    
    // URLのボットIDに基づいてselectedChatbotを設定
    useEffect(() => {
      if (botId && chatbots.length > 0) {
        const bot = chatbots.find(b => b.id === botId);
        if (bot && (!selectedChatbot || selectedChatbot.id !== botId)) {
          setSelectedChatbot(bot);
        } else if (!bot) {
          // ボットが見つからない場合はボット一覧に戻る
          navigate('/bots');
        }
      }
    }, [botId, chatbots, selectedChatbot, navigate]);

    if (!botId || !selectedChatbot || selectedChatbot.id !== botId) {
      return <Navigate to="/bots" replace />;
    }

    switch (view) {
      case 'overview':
        return (
          <div className="h-full">
            <OverviewPanel
              chatbot={selectedChatbot}
              onEdit={() => navigate(`/bots/${botId}/github`)}
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
              onSave={(webhooks) => {
            // TODO: Webhook保存の実装
          }}
            />
          </div>
        );
      case 'users':
        return (
          <div className="h-full">
            <UserPanel
              chatbot={selectedChatbot}
              onSave={(userAccess) => {
            // TODO: ユーザーアクセス保存の実装
          }}
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
        return <Navigate to={`/bots/${botId}/overview`} replace />;
    }
  };

  // Route Components
  const CreateBotRoute = () => (
    <div className="h-full">
      <SimpleBotForm
        onCancel={() => navigate('/bots')}
        onSave={handleSaveNewChatbot}
      />
    </div>
  );

  const BotsRoute = () => (
    <div className="h-full">
      <div className="max-w-5xl mx-auto px-4 py-4">
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
              navigate(`/bots/${bot.botId}/overview`);
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

  // 以下の個別のRoute Componentは削除 (BotDetailRouteに統合)

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
          currentView={getCurrentView()}
          onViewChange={(view) => {
            if (selectedChatbot && view !== 'bots' && view !== 'create') {
              navigate(`/bots/${selectedChatbot.id}/${view}`);
            } else {
              navigate(`/${view}`);
            }
          }}
        />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin">
            <Routes>
              <Route path="/" element={<Navigate to="/bots" replace />} />
              <Route path="/bots" element={<BotsRoute />} />
              <Route path="/create" element={<CreateBotRoute />} />
              <Route path="/bots/:botId/overview" element={<BotDetailRoute view="overview" />} />
              <Route path="/bots/:botId/github" element={<BotDetailRoute view="github" />} />
              <Route path="/bots/:botId/s3" element={<BotDetailRoute view="s3" />} />
              <Route path="/bots/:botId/webhooks" element={<BotDetailRoute view="webhooks" />} />
              <Route path="/bots/:botId/users" element={<BotDetailRoute view="users" />} />
              <Route path="/bots/:botId/security" element={<BotDetailRoute view="security" />} />
              {/* 旧ルートからの互換性のためのリダイレクト */}
              <Route path="/overview" element={<Navigate to="/bots" replace />} />
              <Route path="/github" element={<Navigate to="/bots" replace />} />
              <Route path="/s3" element={<Navigate to="/bots" replace />} />
              <Route path="/webhooks" element={<Navigate to="/bots" replace />} />
              <Route path="/users" element={<Navigate to="/bots" replace />} />
              <Route path="/security" element={<Navigate to="/bots" replace />} />
            </Routes>
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
