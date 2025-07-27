import { Bot, Sparkles, Plus } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { Chat } from '../types';
import ChatInput from './ChatInput';
import Message from './Message';

interface ChatAreaProps {
  currentChat: Chat | null;
  onSendMessage: (message: string) => void;
  isTyping: boolean;
  bots?: Array<{
    botId: string;
    botName: string;
    description: string;
    isActive: boolean;
  }>;
  onStartNewChat?: () => void;
  showNoChatRoomMessage?: boolean;
  hasChats?: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  currentChat, 
  onSendMessage, 
  isTyping, 
  bots = [],
  onStartNewChat,
  showNoChatRoomMessage = false,
  hasChats = true
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが来たら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, isTyping]);

  const EmptyState = () => (
    <div className="flex-1 flex items-center justify-center p-3 overflow-y-auto scrollbar-thin">
      <div className="text-center max-w-2xl">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Bot className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">ChatBot AIへようこそ</h2>
        <p className="text-lg text-gray-600 mb-6">
          質問や相談をお気軽にどうぞ。AIがお答えします。
        </p>
        
        {/* チャット履歴がない場合の特別表示 */}
        {!hasChats && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">新しいチャットを開始しましょう</h3>
            <p className="text-blue-700 mb-4">
              まずはチャットルームを作成して、AIアシスタントとの会話を始めてください。
            </p>
            
            {onStartNewChat && (
              <button
                onClick={onStartNewChat}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                新しいチャットを作成
              </button>
            )}
          </div>
        )}
        
        {/* サンプル質問 (チャット履歴がある場合のみ表示) */}
        {hasChats && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700 mb-3">例えば、こんなことを聞いてみてください：</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                '今日の天気はどうですか？',
                'JavaScriptについて教えて',
                'おすすめのレシピを教えて',
                '効率的な勉強方法は？'
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSendMessage(suggestion)}
                  className="px-4 py-3 text-sm bg-white text-blue-700 rounded-lg hover:bg-blue-50 hover:shadow-md transition-all border border-blue-200 flex items-center"
                >
                  <Sparkles className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-left">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const NoChatRoomState = () => (
    <div className="flex-1 flex items-center justify-center p-3 overflow-y-auto scrollbar-thin">
      <div className="text-center max-w-2xl">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Bot className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">チャットルームが見つかりません</h2>
        <p className="text-lg text-gray-600 mb-6">
          指定されたチャットルームは存在しないか、削除されています。
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">新しいチャットを開始しましょう</h3>
          <p className="text-blue-700 mb-4">
            まずはチャットルームを作成して、AIアシスタントとの会話を始めてください。
          </p>
          
          {onStartNewChat && (
            <button
              onClick={onStartNewChat}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              新しいチャットを作成
            </button>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          <p>サイドバーから既存のチャットを選択するか、新しいチャットを作成してください。</p>
        </div>
      </div>
    </div>
  );

  if (!currentChat) {
    if (showNoChatRoomMessage) {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <NoChatRoomState />
        </div>
      );
    }
    
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <EmptyState />
        {/* ルート画面では入力欄を表示しない */}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* チャットヘッダー */}
      <div className="flex-shrink-0 border-b border-gray-200 p-3 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{currentChat.title}</h2>
            <p className="text-sm text-gray-500">
              {(() => {
                const botId = currentChat.botId;
                const bot = bots.find(b => b.botId === botId);
                return bot ? `${bot.botName}・オンライン` : 'AIアシスタント・オンライン';
              })()}
            </p>
          </div>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin">
        <div className="w-full max-w-4xl mx-auto">
          {currentChat.messages.length === 0 ? (
            <div className="text-center py-4">
              <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                新しいチャットを開始しました。何でもお聞きください！
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentChat.messages.map((message) => (
                <div key={message.id} className="group">
                  <Message message={message} />
                </div>
              ))}
            </div>
          )}

          {/* タイピングインジケーター */}
          {isTyping && (
            <div className="group">
              <Message
                message={{
                  id: 'typing',
                  content: '',
                  role: 'assistant',
                  timestamp: new Date()
                }}
                isTyping={true}
              />
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 入力エリア */}
      <div className="flex-shrink-0">
        <ChatInput 
          onSendMessage={onSendMessage} 
          disabled={isTyping}
          placeholder={
            currentChat.messages.length === 0 
              ? "最初のメッセージを入力してください..." 
              : "メッセージを入力してください..."
          }
        />
      </div>
    </div>
  );
};

export default ChatArea;