import { Bot, Copy, ThumbsDown, ThumbsUp, User } from 'lucide-react';
import React from 'react';
import { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
  isTyping?: boolean;
}

const Message: React.FC<MessageProps> = ({ message, isTyping = false }) => {
  const isUser = message.role === 'user';

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* アバター */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
              isUser 
                ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white' 
                : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
            }`}
          >
            {isUser ? (
              <User className="w-5 h-5" />
            ) : (
              <Bot className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* メッセージ内容 */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* メッセージバブル */}
          <div
            className={`relative px-4 py-3 rounded-2xl shadow-sm ${
              isUser
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                : 'bg-white text-gray-900 border border-gray-200'
            }`}
          >
            {/* タイピングインジケーター */}
            {isTyping ? (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500 ml-2">入力中...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.content}
              </div>
            )}
          </div>

          {/* タイムスタンプと操作ボタン */}
          {!isTyping && (
            <div className={`flex items-center mt-2 space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
              <span className="text-xs text-gray-400">
                {formatTime(message.timestamp)}
              </span>
              
              {/* AIメッセージの場合のみ操作ボタンを表示 */}
              {!isUser && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={handleCopyMessage}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Copy message"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Like message"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Dislike message"
                  >
                    <ThumbsDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;