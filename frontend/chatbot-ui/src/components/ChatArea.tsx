import React, { useRef, useEffect } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import Message from './Message';
import ChatInput from './ChatInput';
import { Chat, Message as MessageType } from '../types';

interface ChatAreaProps {
  currentChat: Chat | null;
  onSendMessage: (message: string) => void;
  isTyping: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({ currentChat, onSendMessage, isTyping }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが来たら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, isTyping]);

  const EmptyState = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Bot className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">ChatBot AIへようこそ</h2>
        <p className="text-gray-600 mb-4">
          質問や相談をお気軽にどうぞ。AIがお答えします。
        </p>
        
        {/* サンプル質問 */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700 mb-2">例えば、こんなことを聞いてみてください：</p>
          <div className="grid gap-1.5">
            {[
              '今日の天気はどうですか？',
              'JavaScriptについて教えて',
              'おすすめのレシピを教えて',
              '効率的な勉強方法は？'
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSendMessage(suggestion)}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <Sparkles className="w-3 h-3 inline mr-2" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!currentChat) {
    return (
      <div className="flex-1 flex flex-col">
        <EmptyState />
        <ChatInput onSendMessage={onSendMessage} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* チャットヘッダー */}
      <div className="flex-shrink-0 border-b border-gray-200 p-3 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{currentChat.title}</h2>
            <p className="text-sm text-gray-500">AIアシスタント・オンライン</p>
          </div>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="max-w-4xl mx-auto">
          {currentChat.messages.length === 0 ? (
            <div className="text-center py-6">
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