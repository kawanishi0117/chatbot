import {
        Activity,
        AlertTriangle,
        Bot,
        CheckCircle,
        Database,
        Edit,
        Github,
        ToggleLeft,
        ToggleRight,
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
      detail: chatbot.githubRepo || 'リポジトリが設定されていません'
    },
    {
      label: 'S3フォルダ',
      value: chatbot.s3Folder ? '設定済み' : '未設定',
      icon: Database,
      status: chatbot.s3Folder ? 'success' : 'warning',
      detail: chatbot.s3Folder || 'S3フォルダが設定されていません'
    },
    {
      label: 'アクセス許可',
      value: '3ユーザー',
      icon: Users,
      status: 'success',
      detail: '管理者: 1名、一般ユーザー: 2名'
    },
    {
      label: '稼働状況',
      value: chatbot.isActive ? 'アクティブ' : '停止中',
      icon: Activity,
      status: chatbot.isActive ? 'success' : 'error',
      detail: chatbot.isActive ? '正常に動作しています' : 'ボットが停止しています'
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
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className={`
            flex items-center justify-center w-16 h-16 rounded-2xl
            ${chatbot.isActive 
              ? 'bg-gradient-to-r from-green-400 to-blue-500' 
              : 'bg-gradient-to-r from-gray-400 to-gray-600'
            }
          `}>
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{chatbot.name}</h1>
            <p className="text-gray-600 mt-1">{chatbot.description}</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${chatbot.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
                }
              `}>
                {chatbot.isActive ? 'アクティブ' : '停止中'}
              </span>
              <span className="text-xs text-gray-500">
                作成日: {new Date(chatbot.createdAt).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleStatus}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${chatbot.isActive
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
              }
            `}
          >
            {chatbot.isActive ? (
              <>
                <ToggleLeft className="w-4 h-4" />
                停止
              </>
            ) : (
              <>
                <ToggleRight className="w-4 h-4" />
                開始
              </>
            )}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors"
          >
            <Edit className="w-4 h-4" />
            編集
          </button>
        </div>
      </div>

      {/* ステータスカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`p-4 rounded-xl border-2 ${getStatusColor(stat.status)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{stat.label}</h3>
                    <p className="text-sm text-gray-600 mt-1">{stat.detail}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(stat.status)}
                  <span className="text-sm font-medium text-gray-900">
                    {stat.value}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 最近のアクティビティ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">最近のアクティビティ</h2>
        <div className="space-y-2">
          {[
            {
              action: 'GitHub リポジトリが更新されました',
              time: '2時間前',
              type: 'info'
            },
            {
              action: 'S3 フォルダの同期が完了しました',
              time: '4時間前',
              type: 'success'
            },
            {
              action: '新しいユーザーがアクセス権限を取得しました',
              time: '1日前',
              type: 'info'
            },
            {
              action: 'Webhook の設定が変更されました',
              time: '2日前',
              type: 'warning'
            }
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`
                w-2 h-2 rounded-full
                ${activity.type === 'success' ? 'bg-green-400' :
                  activity.type === 'warning' ? 'bg-yellow-400' :
                  activity.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                }
              `} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* クイック設定 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            title: 'GitHub連携',
            description: 'リポジトリの設定を管理',
            action: 'github',
            icon: Github,
            color: 'from-gray-600 to-gray-800'
          },
          {
            title: 'S3設定',
            description: 'データソースの設定',
            action: 's3',
            icon: Database,
            color: 'from-orange-500 to-red-600'
          },
          {
            title: 'ユーザー管理',
            description: 'アクセス権限の設定',
            action: 'users',
            icon: Users,
            color: 'from-purple-500 to-indigo-600'
          }
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              className="p-3 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all text-left group"
            >
              <div className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OverviewPanel;