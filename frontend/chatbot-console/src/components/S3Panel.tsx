import {
	Calendar,
	CheckCircle,
	Database,
	Folder,
	HardDrive,
	RefreshCw,
	Save,
	Search
} from 'lucide-react';
import React, { useState } from 'react';
import { ChatbotConfig, S3Folder } from '../types';

interface S3PanelProps {
  chatbot: ChatbotConfig;
  onSave: (s3Folder: string) => void;
}

const S3Panel: React.FC<S3PanelProps> = ({ chatbot, onSave }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(chatbot.s3Folder);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // デモ用のS3フォルダデータ
  const mockFolders: S3Folder[] = [
    {
      name: 'documents/',
      path: 's3://chatbot-bucket/documents/',
      size: 2.4 * 1024 * 1024 * 1024, // 2.4GB
      lastModified: '2024-01-15T10:30:00Z'
    },
    {
      name: 'knowledge-base/',
      path: 's3://chatbot-bucket/knowledge-base/',
      size: 850 * 1024 * 1024, // 850MB
      lastModified: '2024-01-14T16:20:00Z'
    },
    {
      name: 'training-data/',
      path: 's3://chatbot-bucket/training-data/',
      size: 1.8 * 1024 * 1024 * 1024, // 1.8GB
      lastModified: '2024-01-13T09:15:00Z'
    },
    {
      name: 'faq/',
      path: 's3://chatbot-bucket/faq/',
      size: 120 * 1024 * 1024, // 120MB
      lastModified: '2024-01-12T14:45:00Z'
    },
    {
      name: 'manuals/',
      path: 's3://chatbot-bucket/manuals/',
      size: 3.2 * 1024 * 1024 * 1024, // 3.2GB
      lastModified: '2024-01-11T11:30:00Z'
    }
  ];

  const filteredFolders = mockFolders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // デモ用のリフレッシュ処理
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setTimeout(() => {
      onSave(selectedFolder);
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">S3設定</h1>
            <p className="text-gray-600 mt-1">
              {chatbot.name} のデータソースとなるS3フォルダを設定してください
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedFolder && (
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
                placeholder="フォルダ名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setIsLoading(true)}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              <span>更新</span>
            </button>
          </div>
          
          {/* 現在の設定 */}
          {selectedFolder && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">現在の設定</p>
                    <p className="text-sm text-green-700 font-mono">{selectedFolder}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フォルダ一覧 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">利用可能なS3フォルダ</h3>
            <p className="text-sm text-gray-600 mt-1">選択可能なS3フォルダの一覧です</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredFolders.map((folder) => (
              <div
                key={folder.path}
                className={`p-6 cursor-pointer transition-colors ${
                  selectedFolder === folder.path
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedFolder(folder.path)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Folder className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">{folder.name}</h4>
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        <HardDrive className="w-3 h-3 mr-1" />
                        {formatFileSize(folder.size)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 font-mono">{folder.path}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        最終更新: {formatDate(folder.lastModified)}
                      </span>
                    </div>
                  </div>
                  
                  {selectedFolder === folder.path && (
                    <CheckCircle className="w-6 h-6 text-blue-600 ml-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {filteredFolders.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">フォルダが見つかりません</p>
              <p className="text-sm">検索条件を変更してお試しください</p>
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setSelectedFolder('')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            クリア
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedFolder || isSaving}
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

export default S3Panel;