import {
    AlertTriangle,
    BarChart3,
    Bot,
    CheckCircle,
    Clock,
    Database,
    Edit,
    Github,
    Link,
    Power,
    Users,
    XCircle
} from 'lucide-react';
import React from 'react';
import { ChatbotConfig } from '../types';

interface OverviewPanelProps {
  chatbot: ChatbotConfig;
  onEdit: () => void;
  onToggleStatus: () => void;
}

const OverviewPanel: React.FC<OverviewPanelProps> = ({ 
  chatbot, 
  onEdit, 
  onToggleStatus 
}) => {
  const stats = [
    {
      label: 'GitHub連携',
      value: chatbot.githubRepo ? '設定済み' : '未設定',
      icon: Github,
      status: chatbot.githubRepo ? 'success' : 'warning',
      detail: chatbot.githubRepo || 'リポジトリが設定されていません',
      href: '#github'
    },
    {
      label: 'S3フォルダ',
      value: chatbot.s3Folder ? '設定済み' : '未設定',
      icon: Database,
      status: chatbot.s3Folder ? 'success' : 'warning',
      detail: chatbot.s3Folder || 'S3フォルダが設定されていません',
      href: '#s3'
    },
    {
      label: 'Webhook',
      value: '未設定',
      icon: Link,
      status: 'warning',
      detail: 'Webhookが設定されていません',
      href: '#webhooks'
    },
    {
      label: 'ユーザー管理',
      value: '3名',
      icon: Users,
      status: 'success',
      detail: '管理者: 1名、一般ユーザー: 2名',
      href: '#users'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'error':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className={`
                flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg
                ${chatbot.isActive 
                  ? 'bg-gradient-to-br from-green-400 to-blue-500' 
                  : 'bg-gradient-to-br from-gray-400 to-gray-600'
                }
              `}>
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{chatbot.name}</h1>
                <p className="text-gray-600 mt-1">{chatbot.description || 'チャットボットの説明がありません'}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className={`
                    inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                    ${chatbot.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                    }
                  `}>
                    <Power className="w-4 h-4 mr-1.5" />
                    {chatbot.isActive ? 'アクティブ' : '停止中'}
                  </span>
                  <span className="text-sm text-gray-500 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    最終更新: {new Date(chatbot.updatedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onToggleStatus}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${chatbot.isActive 
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' 
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }
              `}
            >
              <Power className="w-4 h-4" />
              {chatbot.isActive ? '停止する' : '開始する'}
            </button>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <a
                key={stat.label}
                href={stat.href}
                onClick={(e) => {
                  e.preventDefault();
                  onEdit();
                }}
                className={`
                  block bg-white rounded-xl border p-6 transition-all cursor-pointer
                  ${getStatusColor(stat.status)}
                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`
                    w-12 h-12 rounded-lg flex items-center justify-center
                    ${stat.status === 'success' ? 'bg-green-100' : 
                      stat.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'}
                  `}>
                    <Icon className={`
                      w-6 h-6
                      ${stat.status === 'success' ? 'text-green-600' : 
                        stat.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}
                    `} />
                  </div>
                  {getStatusIcon(stat.status)}
                </div>
                
                <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.label}</h3>
                <p className="text-xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{stat.detail}</p>
              </a>
            );
          })}
        </div>

        {/* 最近のアクティビティ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-gray-500" />
              最近のアクティビティ
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              すべて表示
            </button>
          </div>
          
          <div className="space-y-3">
            {[
              { time: '2時間前', action: 'GitHub リポジトリが更新されました', type: 'github' },
              { time: '4時間前', action: '新しいユーザーがアクセス権限を取得しました', type: 'user' },
              { time: '1日前', action: 'S3 フォルダの同期が完了しました', type: 's3' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 py-2">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${activity.type === 'github' ? 'bg-purple-100' :
                    activity.type === 'user' ? 'bg-blue-100' : 'bg-green-100'}
                `}>
                  {activity.type === 'github' ? <Github className="w-4 h-4 text-purple-600" /> :
                   activity.type === 'user' ? <Users className="w-4 h-4 text-blue-600" /> :
                   <Database className="w-4 h-4 text-green-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* クイックアクション */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">クイックアクション</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-all font-medium"
            >
              <Edit className="w-4 h-4" />
              設定を編集
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-all font-medium">
              <BarChart3 className="w-4 h-4" />
              統計を表示
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-all font-medium">
              <Link className="w-4 h-4" />
              Webhookをテスト
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPanel;