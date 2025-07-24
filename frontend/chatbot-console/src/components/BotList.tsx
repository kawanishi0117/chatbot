import {
    Activity,
    Calendar,
    Clock,
    Edit,
    MoreVertical,
    Power,
    RefreshCw,
    Rocket,
    Trash2,
    User
} from 'lucide-react';
import React from 'react';
import { BotSettings } from '../types';
import { LoadingButton, LoadingSkeleton } from './loading';

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
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // ローディング状態
  if (loading) {
    return (
      <div className="space-y-6">
        {/* ヘッダースケルトン */}
        <div className="flex items-center justify-between">
          <div>
            <LoadingSkeleton variant="text" width="120px" className="mb-2" />
            <LoadingSkeleton variant="text" width="200px" />
          </div>
          <LoadingSkeleton variant="rectangular" width="80px" height="36px" />
        </div>

        {/* カードスケルトン */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <LoadingSkeleton variant="circular" width="48px" height="48px" />
                  <div>
                    <LoadingSkeleton variant="text" width="120px" className="mb-2" />
                    <LoadingSkeleton variant="text" width="80px" />
                  </div>
                </div>
                <LoadingSkeleton variant="circular" width="32px" height="32px" />
              </div>
              <LoadingSkeleton variant="text" lines={2} className="mb-4" />
              <div className="space-y-2">
                <LoadingSkeleton variant="text" width="100%" />
                <LoadingSkeleton variant="text" width="100%" />
                <LoadingSkeleton variant="text" width="100%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ボットが存在しない場合
  if (bots.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Rocket className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            まだボットがありません
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            最初のチャットボットを作成して、AIアシスタントの構築を始めましょう
          </p>
          <LoadingButton
            onClick={onRefresh}
            variant="outline"
            size="md"
          >
            <RefreshCw className="w-4 h-4" />
            再読み込み
          </LoadingButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* リスト統計情報 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {bots.length}個のボット
          </h2>
          <p className="text-sm text-gray-500">
            アクティブ: {bots.filter(bot => bot.isActive).length} / 停止中: {bots.filter(bot => !bot.isActive).length}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
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
            className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
          >
            {/* カードヘッダー */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center shadow-sm
                    ${bot.isActive 
                      ? 'bg-gradient-to-br from-green-400 to-blue-500' 
                      : 'bg-gradient-to-br from-gray-400 to-gray-600'
                    }
                  `}>
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {bot.botName}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`
                        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${bot.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                        }
                      `}>
                        <Power className="w-3 h-3 mr-1" />
                        {bot.isActive ? 'アクティブ' : '停止中'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* アクションメニュー */}
                <div className="relative">
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* 説明 */}
              {bot.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {bot.description}
                </p>
              )}

              {/* メタ情報 */}
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <User className="w-3.5 h-3.5 mr-1.5" />
                    作成者
                  </span>
                  <span className="font-medium text-gray-700">
                    {bot.creatorId || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    最終更新
                  </span>
                  <span className="font-medium text-gray-700">
                    {formatDate(bot.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    作成日
                  </span>
                  <span className="font-medium text-gray-700">
                    {formatDate(bot.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* カードフッター */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => onEdit(bot)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Edit className="w-4 h-4" />
                設定を編集
              </button>
              <button
                onClick={() => onDelete(bot)}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                title="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BotList; 