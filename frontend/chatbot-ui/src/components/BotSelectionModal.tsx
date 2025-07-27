import { Bot, X } from 'lucide-react';
import React, { useEffect } from 'react';
import { LoadingSpinner } from './loading';

interface BotSelectionModalProps {
  isOpen: boolean;
  bots: Array<{
    botId: string;
    botName: string;
    description: string;
    isActive: boolean;
  }>;
  isLoading: boolean;
  onSelectBot: (botId: string) => void;
  onClose: () => void;
}

const BotSelectionModal: React.FC<BotSelectionModalProps> = ({
  isOpen,
  bots,
  isLoading,
  onSelectBot,
  onClose
}) => {
  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleBotSelect = (botId: string) => {
    onSelectBot(botId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleOverlayClick}
      />

      {/* モーダルコンテンツ */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">ボットを選択</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            新しいチャットで使用するボットを選択してください
          </p>

          {/* ローディング状態 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <LoadingSpinner size="lg" color="primary" />
                <p className="text-gray-500 mt-3">ボット一覧を読み込み中...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {bots.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">利用可能なボットがありません</p>
                </div>
              ) : (
                bots.map((bot) => (
                  <button
                    key={bot.botId}
                    onClick={() => handleBotSelect(bot.botId)}
                    className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Bot className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                          {bot.botName}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {bot.description || 'AIアシスタント'}
                        </p>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-xs text-green-600">オンライン</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotSelectionModal; 