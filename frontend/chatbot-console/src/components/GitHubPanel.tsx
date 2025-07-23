import {
    CheckCircle,
    ExternalLink,
    Github,
    Lock,
    RefreshCw,
    Save,
    Search,
    Unlock
} from 'lucide-react';
import React, { useState } from 'react';
import { ChatbotConfig, GitHubRepo } from '../types';

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
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GitHub設定</h1>
            <p className="text-gray-600 mt-1">
              {chatbot.name} に関連するGitHubリポジトリを設定してください
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedRepo && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">設定済み</span>
              </div>
            )}
          </div>
        </div>

        {/* 検索バー */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="リポジトリ名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setIsSearching(true)}
              disabled={isSearching}
              className="inline-flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSearching ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span>検索</span>
            </button>
          </div>
          
          {/* 現在の設定 */}
          {selectedRepo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Github className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">現在の設定</p>
                    <p className="text-sm text-green-700">{selectedRepo}</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-green-600" />
              </div>
            </div>
          )}
        </div>

        {/* リポジトリ一覧 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">利用可能なリポジトリ</h3>
            <p className="text-sm text-gray-600 mt-1">選択可能なGitHubリポジトリの一覧です</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredRepos.map((repo) => (
              <div
                key={repo.fullName}
                className={`p-6 cursor-pointer transition-colors ${
                  selectedRepo === repo.fullName
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRepo(repo.fullName)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Github className="w-5 h-5 text-gray-600" />
                      <h4 className="font-semibold text-gray-900">{repo.name}</h4>
                      {repo.private && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          <Lock className="w-3 h-3" />
                          <span>Private</span>
                        </span>
                      )}
                      {!repo.private && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          <Unlock className="w-3 h-3" />
                          <span>Public</span>
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{repo.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{repo.fullName}</span>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>GitHubで開く</span>
                      </a>
                    </div>
                  </div>
                  
                  {selectedRepo === repo.fullName && (
                    <CheckCircle className="w-6 h-6 text-blue-600 ml-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {filteredRepos.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Github className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">リポジトリが見つかりません</p>
              <p className="text-sm">検索条件を変更してお試しください</p>
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setSelectedRepo('')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            クリア
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedRepo || isSaving}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? '保存中...' : '設定を保存'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GitHubPanel;