import React from 'react';
import { 
  Bot, 
  Plus, 
  Settings, 
  Users, 
  Webhook, 
  Github, 
  Database,
  Activity,
  Shield
} from 'lucide-react';
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
  const menuItems = [
    { id: 'overview', label: '概要', icon: Activity },
    { id: 'github', label: 'GitHub設定', icon: Github },
    { id: 's3', label: 'S3設定', icon: Database },
    { id: 'webhooks', label: 'Webhook設定', icon: Webhook },
    { id: 'users', label: 'ユーザー管理', icon: Users },
    { id: 'security', label: 'セキュリティ', icon: Shield },
  ];

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
        fixed top-16 left-0 bottom-0 w-80 bg-white border-r border-gray-200 z-30
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-10
      `}>
        <div className="flex flex-col h-full">
          {/* チャットボット選択部分 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">チャットボット</h2>
              <button
                onClick={onCreateChatbot}
                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                title="新しいチャットボットを作成"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {chatbots.map((chatbot) => (
                <button
                  key={chatbot.id}
                  onClick={() => onSelectChatbot(chatbot)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-colors
                    ${selectedChatbot?.id === chatbot.id
                      ? 'bg-blue-50 border-2 border-blue-200 text-blue-900'
                      : 'bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-lg
                      ${chatbot.isActive 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400'
                      }
                    `}>
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{chatbot.name}</p>
                      <p className="text-xs text-gray-500 truncate">{chatbot.description}</p>
                    </div>
                    <div className={`
                      w-2 h-2 rounded-full
                      ${chatbot.isActive ? 'bg-green-400' : 'bg-gray-300'}
                    `} />
                  </div>
                </button>
              ))}

              {chatbots.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">チャットボットがありません</p>
                  <button
                    onClick={onCreateChatbot}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    最初のボットを作成
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* メニュー部分 */}
          <div className="flex-1 p-4">
            {selectedChatbot ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">設定メニュー</h3>
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`
                          w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                          ${currentView === item.id
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
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
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">チャットボットを選択してください</p>
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>ChatBot Console v1.0</p>
              <p className="mt-1">© 2024 All rights reserved</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;