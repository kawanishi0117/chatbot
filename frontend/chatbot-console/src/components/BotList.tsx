import React from 'react';
import {
  RefreshCw,
  Calendar,
  Edit,
  Rocket,
  Square,
  Trash2,
  User,
} from 'lucide-react';
import { BotSettings } from '../types';

interface BotListProps {
  bots: BotSettings[];
  loading: boolean;
  onEdit: (bot: BotSettings) => void;
  onDelete: (bot: BotSettings) => void;
  onRefresh: () => void;
}

const BotList: React.FC<BotListProps> = ({
  bots,
  loading,
  onEdit,
  onDelete,
  onRefresh
}) => {
  // 日時フォーマット関数
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ローディング状態
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">ボット一覧を読み込み中...</p>
        </div>
      </div>
    );
  }

  // ボットが存在しない場合
  if (bots.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-8 text-center">
          <Rocket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ボットがありません
          </h3>
          <p className="text-gray-500 mb-6">
            最初のボットを作成して始めましょう
          </p>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="w-4 h-4" />
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* リスト統計情報 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {bots.length}個のボットが見つかりました
        </p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          更新
        </button>
      </div>

      {/* ボットカードリスト */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map((bot) => (
          <div
            key={bot.botId}
            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            {/* カードヘッダー */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {bot.botName}
                    </h3>
                  </div>
                  
                  {/* ステータスバッジ */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bot.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {bot.isActive ? (
                        <Rocket className="w-3 h-3" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                      {bot.isActive ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(bot)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                    title="編集"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(bot)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 説明 */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {bot.description || '説明がありません'}
              </p>
            </div>

            {/* カードフッター */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>作成者: {bot.creatorId}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>作成: {formatDate(bot.createdAt)}</span>
                </div>
                
                {bot.updatedAt !== bot.createdAt && (
                  <div className="text-xs text-gray-400">
                    更新: {formatDate(bot.updatedAt)}
                  </div>
                )}
              </div>

              {/* ボットID（デバッグ用） */}
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 truncate" title={bot.botId}>
                  ID: {bot.botId}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* リスト末尾の統計 */}
      <div className="text-center py-4 border-t border-gray-200">
        <div className="flex justify-center items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 rounded-full"></div>
            <span>
              アクティブ: {bots.filter(bot => bot.isActive).length}個
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 rounded-full"></div>
            <span>
              非アクティブ: {bots.filter(bot => !bot.isActive).length}個
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotList; 