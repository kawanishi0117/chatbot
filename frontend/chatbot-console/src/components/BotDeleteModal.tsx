import {
  AlertTriangle,
  Trash2,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { BotSettings } from '../types';

interface BotDeleteModalProps {
  bot: BotSettings | null;
  onClose: () => void;
  onConfirm: () => void;
}

const BotDeleteModal: React.FC<BotDeleteModalProps> = ({
  bot,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // モーダルが開いていない場合は何も表示しない
  if (!bot) {
    return null;
  }

  // 削除確認処理
  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* オーバーレイ */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* モーダルコンテンツ */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
          {/* アイコンとヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                              <X className="w-6 h-6" />
            </button>
          </div>

          {/* メインコンテンツ */}
          <div className="mt-3 text-center sm:mt-0 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              ボットの削除
            </h3>
            
            <div className="mt-2 mb-6">
              <p className="text-sm text-gray-500 mb-4">
                以下のボットを完全に削除します。この操作は取り消すことができません。
              </p>
              
              {/* ボット情報カード */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {bot.botName}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2">
                      ID: {bot.botId}
                    </p>
                    {bot.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {bot.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>作成者: {bot.creatorId}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        bot.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {bot.isActive ? 'アクティブ' : '非アクティブ'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 警告メッセージ */}
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
              <div className="flex">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">
                    注意事項
                  </h4>
                  <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                    <li>この操作は元に戻すことができません</li>
                    <li>ボットに関連する全ての設定が削除されます</li>
                    <li>進行中の処理があれば中断される可能性があります</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 確認テキスト */}
            <p className="text-sm text-gray-600">
              本当に <strong className="text-gray-900">「{bot.botName}」</strong> を削除しますか？
            </p>
          </div>

          {/* ボタン */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  削除中...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  削除する
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotDeleteModal; 