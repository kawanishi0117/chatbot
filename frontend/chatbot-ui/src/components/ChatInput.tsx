import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "メッセージを入力してください..."
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
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
      console.log('File selected:', file);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // 音声録音処理（今回は実装しない）
    console.log('Recording:', !isRecording);
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-end space-x-2">
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
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] max-h-32"
              rows={1}
            />
            
            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* 音声録音ボタン */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

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