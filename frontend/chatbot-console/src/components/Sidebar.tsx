import {
    Activity,
    ArrowLeft,
    Bot,
    Database,
    Github,
    Plus,
    Shield,
    Users,
    Webhook
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatbotConfig } from '../types';

interface SidebarProps {
  isOpen: boolean;
  chatbots: ChatbotConfig[];
  selectedChatbot: ChatbotConfig | null;
  onSelectChatbot: (chatbot: ChatbotConfig | null) => void;
  onCreateChatbot: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  chatbots,
  selectedChatbot,
  onSelectChatbot,
  onCreateChatbot,
  currentView,
  onViewChange
}) => {
  const navigate = useNavigate();
  
  const menuItems = selectedChatbot ? [
    { id: 'overview', label: '概要', icon: Activity },
    { id: 'github', label: 'GitHub設定', icon: Github },
    { id: 's3', label: 'S3設定', icon: Database },
    { id: 'webhooks', label: 'Webhook設定', icon: Webhook },
    { id: 'users', label: 'ユーザー管理', icon: Users },
    { id: 'security', label: 'セキュリティ', icon: Shield },
  ] : [];

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 lg:hidden"
          onClick={() => onSelectChatbot(null)}
        />
      )}

      {/* サイドバー */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-white border-r border-gray-200 z-30
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-10
      `}>
        <div className="flex flex-col h-full">
          {/* ヘッダー部分 */}
          <div className="p-6 border-b border-gray-200">
            {selectedChatbot ? (
              <div>
                {/* 戻るボタン */}
                <button
                  onClick={() => onSelectChatbot(null)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">ボット一覧に戻る</span>
                </button>
                
                {/* 選択されたボット */}
                <div className="flex items-center space-x-3">
                  <div className={`
                    flex items-center justify-center w-12 h-12 rounded-xl shadow-sm
                    ${selectedChatbot.isActive 
                      ? 'bg-gradient-to-br from-green-400 to-blue-500' 
                      : 'bg-gradient-to-br from-gray-400 to-gray-600'
                    }
                  `}>
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {selectedChatbot.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedChatbot.isActive ? 'アクティブ' : '停止中'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">マイボット</h2>
                <p className="text-sm text-gray-600">チャットボットを選択してください</p>
              </div>
            )}
          </div>

          {/* メニュー部分 */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedChatbot ? (
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={`
                        w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-all
                        ${currentView === item.id
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            ) : (
              <div className="space-y-4">
                {/* 新しいボット作成ボタン */}
                <button
                  onClick={onCreateChatbot}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">新しいボットを作成</span>
                </button>

                {/* ボット一覧 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    保存されたボット
                  </h3>
                  <div className="space-y-2">
                    {chatbots.length > 0 ? (
                      chatbots.map((chatbot) => (
                        <button
                          key={chatbot.id}
                          onClick={() => {
                            onSelectChatbot(chatbot);
                            navigate('/overview');
                          }}
                          className={`
                            w-full text-left p-3 rounded-lg transition-all
                            ${selectedChatbot?.id === chatbot.id
                              ? 'bg-blue-50 border-2 border-blue-200 text-blue-900'
                              : 'bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100'
                            }
                          `}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`
                              flex items-center justify-center w-10 h-10 rounded-lg
                              ${chatbot.isActive 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-gray-200 text-gray-500'
                              }
                            `}>
                              <Bot className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{chatbot.name}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {chatbot.description || '説明なし'}
                              </p>
                            </div>
                            <div className={`
                              w-2 h-2 rounded-full
                              ${chatbot.isActive ? 'bg-green-400' : 'bg-gray-300'}
                            `} />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">ボットがありません</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-400 text-center">
              ChatBot Console v1.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;