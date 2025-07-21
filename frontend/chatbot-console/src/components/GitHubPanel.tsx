import React, { useState } from 'react';
import { 
  Github, 
  Search, 
  ExternalLink, 
  CheckCircle, 
  Lock, 
  Unlock, 
  RefreshCw,
  Save,
  AlertCircle
} from 'lucide-react';
import { GitHubRepo, ChatbotConfig } from '../types';

interface GitHubPanelProps {
  chatbot: ChatbotConfig;
  onSave: (githubRepo: string) => void;
}

const GitHubPanel: React.FC<GitHubPanelProps> = ({ chatbot, onSave }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(chatbot.githubRepo);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // デモ用のリポジトリデータ
  const mockRepos: GitHubRepo[] = [
    {
      name: 'chatbot-docs',
      fullName: 'company/chatbot-docs',
      private: false,
      description: 'チャットボット用ドキュメントリポジトリ',
      url: 'https://github.com/company/chatbot-docs'
    },
    {
      name: 'knowledge-base',
      fullName: 'company/knowledge-base',
      private: true,
      description: 'プライベートナレッジベース',
      url: 'https://github.com/company/knowledge-base'
    },
    {
      name: 'api-documentation',
      fullName: 'company/api-documentation',
      private: false,
      description: 'API仕様書とサンプルコード',
      url: 'https://github.com/company/api-documentation'
    },
    {
      name: 'customer-support',
      fullName: 'company/customer-support',
      private: true,
      description: 'カスタマーサポート用FAQ',
      url: 'https://github.com/company/customer-support'
    }
  ];

  const filteredRepos = mockRepos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = async () => {
    setIsSearching(true);
    // デモ用の検索処理
    setTimeout(() => {
      setIsSearching(false);
    }, 1000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setTimeout(() => {
      onSave(selectedRepo);
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Github className="w-8 h-8" />
            <span>GitHub設定</span>
          </h1>
          <p className="text-gray-600 mt-1">
            チャットボットが参照するGitHubリポジトリを設定します
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!selectedRepo || isSaving}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? '保存中...' : '設定を保存'}</span>
        </button>
      </div>

      {/* 現在の設定 */}
      {chatbot.githubRepo && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">現在の設定</h3>
              <p className="text-green-800 mt-1">
                リポジトリ: <span className="font-mono bg-green-100 px-2 py-1 rounded">{chatbot.githubRepo}</span>
              </p>
              <p className="text-sm text-green-700 mt-2">
                このリポジトリからドキュメントを取得してチャットボットの知識ベースを構築します。
              </p>
            </div>
            <a
              href={`https://github.com/${chatbot.githubRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-green-600 hover:text-green-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">表示</span>
            </a>
          </div>
        </div>
      )}

      {/* 検索セクション */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">リポジトリを検索</h2>
        
        <div className="flex space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="リポジトリ名または説明で検索..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isSearching ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>{isSearching ? '検索中...' : '検索'}</span>
          </button>
        </div>

        {/* リポジトリリスト */}
        <div className="space-y-3">
          {filteredRepos.map((repo) => (
            <div
              key={repo.fullName}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${selectedRepo === repo.fullName
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                }
              `}
              onClick={() => setSelectedRepo(repo.fullName)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-800 rounded-lg">
                    <Github className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{repo.name}</h3>
                      {repo.private ? (
                        <Lock className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Unlock className="w-4 h-4 text-gray-500" />
                      )}
                      <span className={`
                        px-2 py-1 text-xs font-medium rounded-full
                        ${repo.private ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                      `}>
                        {repo.private ? 'Private' : 'Public'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{repo.description}</p>
                    <p className="text-sm text-gray-500 mt-1 font-mono">{repo.fullName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedRepo === repo.fullName && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRepos.length === 0 && searchQuery && (
          <div className="text-center py-8 text-gray-500">
            <Github className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>検索結果が見つかりませんでした</p>
          </div>
        )}
      </div>

      {/* 設定説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">GitHub連携について</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• チャットボットは選択されたリポジトリのMarkdownファイルやドキュメントを分析します</p>
              <p>• プライベートリポジトリの場合、適切なアクセス権限が必要です</p>
              <p>• リポジトリの更新は自動的に同期され、チャットボットの知識が更新されます</p>
              <p>• 大容量のリポジトリの場合、初回同期に時間がかかる場合があります</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubPanel;