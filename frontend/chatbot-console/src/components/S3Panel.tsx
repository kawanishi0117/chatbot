import React, { useState } from 'react';
import { 
  Database, 
  Folder, 
  File, 
  CheckCircle, 
  RefreshCw,
  Save,
  AlertCircle,
  HardDrive,
  Calendar,
  Search
} from 'lucide-react';
import { S3Folder, ChatbotConfig } from '../types';

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
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Database className="w-8 h-8" />
            <span>S3設定</span>
          </h1>
          <p className="text-gray-600 mt-1">
            チャットボットが分析するS3フォルダを設定します
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? '更新中...' : 'フォルダ更新'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!selectedFolder || isSaving}
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
      </div>

      {/* 現在の設定 */}
      {chatbot.s3Folder && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">現在の設定</h3>
              <p className="text-green-800 mt-1">
                S3フォルダ: <span className="font-mono bg-green-100 px-2 py-1 rounded">{chatbot.s3Folder}</span>
              </p>
              <p className="text-sm text-green-700 mt-2">
                このフォルダ内のファイルを分析してチャットボットの知識ベースを構築します。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 検索とフィルター */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">S3フォルダ一覧</h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="フォルダを検索..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* フォルダリスト */}
        <div className="space-y-3">
          {filteredFolders.map((folder) => (
            <div
              key={folder.path}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${selectedFolder === folder.path
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                }
              `}
              onClick={() => setSelectedFolder(folder.path)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                    <Folder className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{folder.name}</h3>
                    <p className="text-sm text-gray-600 mt-1 font-mono">{folder.path}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <HardDrive className="w-3 h-3" />
                        <span>{formatFileSize(folder.size)}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(folder.lastModified)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedFolder === folder.path && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredFolders.length === 0 && searchQuery && (
          <div className="text-center py-8 text-gray-500">
            <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>検索結果が見つかりませんでした</p>
          </div>
        )}
      </div>

      {/* 同期設定 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">同期設定</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">自動同期</h3>
              <p className="text-sm text-gray-600">S3フォルダの変更を自動的に検知して同期</p>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto-sync"
                defaultChecked={true}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-sync" className="ml-2 text-sm text-gray-700">有効</label>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">ファイル形式フィルター</h3>
              <p className="text-sm text-gray-600">処理対象のファイル形式を制限</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">すべてのファイル</option>
              <option value="documents">ドキュメントのみ</option>
              <option value="text">テキストファイルのみ</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">同期頻度</h3>
              <p className="text-sm text-gray-600">定期同期の実行間隔</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="realtime">リアルタイム</option>
              <option value="hourly">1時間ごと</option>
              <option value="daily">1日ごと</option>
              <option value="weekly">1週間ごと</option>
            </select>
          </div>
        </div>
      </div>

      {/* 設定説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">S3連携について</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• チャットボットは選択されたS3フォルダ内のファイルを分析して知識ベースを構築します</p>
              <p>• サポートファイル形式: PDF, DOCX, TXT, MD, CSV, JSON</p>
              <p>• 大容量ファイルの処理には時間がかかる場合があります</p>
              <p>• 適切なS3アクセス権限が必要です</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default S3Panel;