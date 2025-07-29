import { Paperclip, Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isAIProcessing?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "メッセージを入力してください...",
  isAIProcessing = false
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを自動調整
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルアップロード処理（今回は実装しない）
      // ファイルが選択されました
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
        <div className="flex items-end space-x-3">
          {/* ファイル添付ボタン */}
          <div className="flex-shrink-0">
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <div className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Paperclip className="w-5 h-5 text-gray-500" />
              </div>
            </label>
          </div>

          {/* メッセージ入力エリア */}
          <div className="flex-1">
            <div className="flex items-end space-x-2 bg-gray-50 rounded-lg p-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 px-3 py-2 bg-transparent border-none resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] max-h-32"
                rows={1}
              />
              
              {/* 送信ボタン */}
              <button
                type="submit"
                disabled={!message.trim() || disabled || isAIProcessing}
                className="flex-shrink-0 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* AI処理中インジケーター */}
        {isAIProcessing && (
          <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>AIが応答を生成中...</span>
            </div>
          </div>
        )}

        {/* ヒント */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> で送信、
            <kbd className="px-1 py-0.5 bg-gray-100 rounded">Shift + Enter</kbd> で改行
          </span>
          <span className={`${message.length > 1000 ? 'text-red-500' : ''}`}>
            {message.length}/2000
          </span>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;