import React from 'react';
import { Plus, MessageCircle, Trash2, Edit3 } from 'lucide-react';
import { Chat } from '../types';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  currentChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  isOpen,
  onClose
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今日';
    if (days === 1) return '昨日';
    if (days < 7) return `${days}日前`;
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  const truncateTitle = (title: string, maxLength: number = 30) => {
    return title.length > maxLength ? title.slice(0, maxLength) + '...' : title;
  };

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* サイドバー */}
      <div
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-80 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:h-screen lg:top-0 lg:pt-16`}
      >
        <div className="flex flex-col h-full">
          {/* 新しいチャットボタン */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={onCreateChat}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新しいチャット</span>
            </button>
          </div>

          {/* チャット一覧 */}
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">まだチャットがありません</p>
                <p className="text-xs">新しいチャットを開始しましょう</p>
              </div>
            ) : (
              <div className="p-2">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group relative mb-1 rounded-lg cursor-pointer transition-colors ${
                      currentChatId === chat.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <div className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-sm font-medium truncate ${
                              currentChatId === chat.id ? 'text-blue-900' : 'text-gray-900'
                            }`}
                          >
                            {truncateTitle(chat.title)}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(chat.updatedAt)}
                          </p>
                          {chat.messages.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {chat.messages[chat.messages.length - 1].content}
                            </p>
                          )}
                        </div>
                        
                        {/* ホバー時のアクション */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // 編集機能は今回は実装しない
                            }}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            aria-label="Edit chat"
                          >
                            <Edit3 className="w-3 h-3 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            className="p-1 rounded hover:bg-red-100 transition-colors"
                            aria-label="Delete chat"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-400 text-center">
              ChatBot AI v1.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;