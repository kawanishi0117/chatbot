import { Plus, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
    ApiResponse,
    BotSettings,
    BotSettingsCreateRequest,
    BotSettingsUpdateRequest
} from '../types';
import BotDeleteModal from './BotDeleteModal';
import BotForm from './BotForm';
import BotList from './BotList';

// ボット設定API（仮実装）
const botSettingsAPI = {
  // ボット一覧取得
  async list(creatorId?: string): Promise<ApiResponse<BotSettings[]>> {
    try {
      const url = creatorId 
        ? `/api/bots?creatorId=${encodeURIComponent(creatorId)}`
        : '/api/bots';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        // バックエンドレスポンス構造: { data: { bots: [...], count: number } }
        const bots = data.data?.bots || data.bots || [];
        console.log('API Response:', data, 'Extracted bots:', bots);
        return { success: true, data: Array.isArray(bots) ? bots : [] };
      } else {
        return { success: false, error: data.message || 'ボット一覧の取得に失敗しました' };
      }
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: 'ネットワークエラーが発生しました' };
    }
  },

  // ボット詳細取得
  async get(botId: string): Promise<ApiResponse<BotSettings>> {
    try {
      const response = await fetch(`/api/bots/${botId}`);
      const data = await response.json();
      
      if (response.ok) {
        return { success: true, data: data.data || data };
      } else {
        return { success: false, error: data.message || 'ボット詳細の取得に失敗しました' };
      }
    } catch (error) {
      return { success: false, error: 'ネットワークエラーが発生しました' };
    }
  },

  // ボット作成
  async create(data: BotSettingsCreateRequest): Promise<ApiResponse<BotSettings>> {
    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('Create Bot Response:', result);
        return { success: true, data: result.data || result };
      } else {
        return { success: false, error: result.message || 'ボットの作成に失敗しました' };
      }
    } catch (error) {
      return { success: false, error: 'ネットワークエラーが発生しました' };
    }
  },

  // ボット更新
  async update(botId: string, data: BotSettingsUpdateRequest): Promise<ApiResponse<BotSettings>> {
    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result.data || result };
      } else {
        return { success: false, error: result.message || 'ボットの更新に失敗しました' };
      }
    } catch (error) {
      return { success: false, error: 'ネットワークエラーが発生しました' };
    }
  },

  // ボット削除
  async delete(botId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: result.message || 'ボットの削除に失敗しました' };
      }
    } catch (error) {
      return { success: false, error: 'ネットワークエラーが発生しました' };
    }
  }
};

interface BotSettingsPanelProps {
  currentUserId: string;
}

const BotSettingsPanel: React.FC<BotSettingsPanelProps> = ({ currentUserId }) => {
  // 状態管理
  const [bots, setBots] = useState<BotSettings[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingBot, setEditingBot] = useState<BotSettings | null>(null);
  const [deletingBot, setDeletingBot] = useState<BotSettings | null>(null);

  // ボット一覧の取得
  const fetchBots = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await botSettingsAPI.list(currentUserId);
      
      if (result.success && result.data) {
        const botsArray = Array.isArray(result.data) ? result.data : [];
        console.log('Fetched bots:', botsArray);
        setBots(botsArray);
      } else {
        console.error('Fetch bots failed:', result.error);
        setBots([]); // 安全のため空配列をセット
        setError(result.error || 'ボット一覧の取得に失敗しました');
      }
    } catch (error) {
      setError('予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 初回ロード
  useEffect(() => {
    fetchBots();
  }, [currentUserId]);

  // 検索フィルタリング（安全な配列チェック付き）
  const filteredBots = (Array.isArray(bots) ? bots : []).filter(bot =>
    bot.botName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bot.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ボット作成処理
  const handleCreateBot = async (data: BotSettingsCreateRequest) => {
    try {
      const result = await botSettingsAPI.create(data);
      
      if (result.success && result.data) {
        setBots(prev => [result.data!, ...prev]);
        setIsFormOpen(false);
        setError(null);
      } else {
        setError(result.error || 'ボットの作成に失敗しました');
      }
    } catch (error) {
      setError('予期しないエラーが発生しました');
    }
  };

  // ボット更新処理
  const handleUpdateBot = async (data: BotSettingsUpdateRequest) => {
    if (!editingBot) return;
    
    try {
      const result = await botSettingsAPI.update(editingBot.botId, data);
      
      if (result.success && result.data) {
        setBots(prev => 
          prev.map(bot => 
            bot.botId === editingBot.botId ? result.data! : bot
          )
        );
        setEditingBot(null);
        setError(null);
      } else {
        setError(result.error || 'ボットの更新に失敗しました');
      }
    } catch (error) {
      setError('予期しないエラーが発生しました');
    }
  };

  // ボット削除処理
  const handleDeleteBot = async () => {
    if (!deletingBot) return;
    
    try {
      const result = await botSettingsAPI.delete(deletingBot.botId);
      
      if (result.success) {
        setBots(prev => prev.filter(bot => bot.botId !== deletingBot.botId));
        setDeletingBot(null);
        setError(null);
      } else {
        setError(result.error || 'ボットの削除に失敗しました');
      }
    } catch (error) {
      setError('予期しないエラーが発生しました');
    }
  };

  // 編集開始
  const startEditing = (bot: BotSettings) => {
    setEditingBot(bot);
    setIsFormOpen(true);
  };

  // 削除確認開始
  const startDeleting = (bot: BotSettings) => {
    setDeletingBot(bot);
  };

  // フォームクローズ
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBot(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-600" />
                ボット設定管理
              </h1>
              <p className="mt-2 text-gray-600">
                チャットボットの設定を管理できます
              </p>
            </div>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-sm transition duration-200 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              新しいボットを作成
            </button>
          </div>
        </div>

        {/* 検索バー */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="ボット名または説明で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ボット一覧 */}
        <BotList
          bots={filteredBots}
          loading={loading}
          onEdit={startEditing}
          onDelete={startDeleting}
          onRefresh={fetchBots}
        />

        {/* ボット作成・編集フォーム */}
        <BotForm
          isOpen={isFormOpen}
          bot={editingBot}
          currentUserId={currentUserId}
          onClose={closeForm}
          onSubmit={editingBot ? handleUpdateBot : handleCreateBot}
        />

        {/* 削除確認モーダル */}
        <BotDeleteModal
          bot={deletingBot}
          onClose={() => setDeletingBot(null)}
          onConfirm={handleDeleteBot}
        />
      </div>
    </div>
  );
};

export default BotSettingsPanel; 