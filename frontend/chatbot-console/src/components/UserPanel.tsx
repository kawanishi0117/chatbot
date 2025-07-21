import {
	Calendar,
	Edit,
	Eye,
	Filter,
	Mail,
	Plus,
	Search,
	Shield,
	Trash2,
	Users
} from 'lucide-react';
import React, { useState } from 'react';
import { ChatbotConfig, User, UserAccess } from '../types';

interface UserPanelProps {
  chatbot: ChatbotConfig;
  onSave: (userAccess: UserAccess[]) => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ chatbot, onSave }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');
  const [isInviting, setIsInviting] = useState(false);

  // デモ用のユーザーデータ
  const [userAccess, setUserAccess] = useState<(UserAccess & { user: User })[]>([
    {
      id: '1',
      chatbotId: chatbot.id,
      userId: 'user1',
      permission: 'admin',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      user: {
        id: 'user1',
        email: 'admin@example.com',
        name: '管理者',
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      }
    },
    {
      id: '2',
      chatbotId: chatbot.id,
      userId: 'user2',
      permission: 'write',
      createdAt: '2024-01-14T16:20:00Z',
      updatedAt: '2024-01-14T16:20:00Z',
      user: {
        id: 'user2',
        email: 'editor@example.com',
        name: '編集者',
        role: 'user',
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-14T16:20:00Z'
      }
    },
    {
      id: '3',
      chatbotId: chatbot.id,
      userId: 'user3',
      permission: 'read',
      createdAt: '2024-01-13T09:15:00Z',
      updatedAt: '2024-01-13T09:15:00Z',
      user: {
        id: 'user3',
        email: 'viewer@example.com',
        name: '閲覧者',
        role: 'user',
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-13T09:15:00Z'
      }
    }
  ]);

  const filteredUsers = userAccess.filter(access => {
    const matchesSearch = 
      access.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      access.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPermission = permissionFilter === 'all' || access.permission === permissionFilter;
    
    return matchesSearch && matchesPermission;
  });

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'admin': return '管理者';
      case 'write': return '編集者';
      case 'read': return '閲覧者';
      default: return permission;
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'write': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdatePermission = (accessId: string, newPermission: string) => {
    setUserAccess(prev => 
      prev.map(access => 
        access.id === accessId 
          ? { ...access, permission: newPermission as any, updatedAt: new Date().toISOString() }
          : access
      )
    );
  };

  const handleRemoveUser = (accessId: string) => {
    setUserAccess(prev => prev.filter(access => access.id !== accessId));
  };

  const InviteUserForm: React.FC<{ onSave: (email: string, permission: string) => void; onCancel: () => void }> = ({ 
    onSave, 
    onCancel 
  }) => {
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState('read');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(email, permission);
      setEmail('');
      setPermission('read');
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ユーザーを招待</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              権限レベル
            </label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="read">閲覧者 - チャットボットの利用のみ</option>
              <option value="write">編集者 - 設定の変更も可能</option>
              <option value="admin">管理者 - 全ての操作が可能</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              招待を送信
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Users className="w-8 h-8" />
            <span>ユーザー管理</span>
          </h1>
          <p className="text-gray-600 mt-1">
            チャットボットにアクセスできるユーザーと権限を管理します
          </p>
        </div>

        <button
          onClick={() => setIsInviting(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>ユーザーを招待</span>
        </button>
      </div>

      {/* 招待フォーム */}
      {isInviting && (
        <InviteUserForm
          onSave={(email, permission) => {
            // デモ用の新規ユーザー追加
            const newUser: User = {
              id: `user${Date.now()}`,
              email,
              name: email.split('@')[0],
              role: 'user',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            const newAccess: UserAccess & { user: User } = {
              id: Date.now().toString(),
              chatbotId: chatbot.id,
              userId: newUser.id,
              permission: permission as any,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: newUser
            };

            setUserAccess(prev => [...prev, newAccess]);
            setIsInviting(false);
          }}
          onCancel={() => setIsInviting(false)}
        />
      )}

      {/* 検索とフィルター */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ユーザー名またはメールアドレスで検索..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={permissionFilter}
              onChange={(e) => setPermissionFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべての権限</option>
              <option value="admin">管理者</option>
              <option value="write">編集者</option>
              <option value="read">閲覧者</option>
            </select>
          </div>
        </div>
      </div>

      {/* ユーザーリスト */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            アクセス権限を持つユーザー ({filteredUsers.length}名)
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredUsers.map((access) => (
            <div key={access.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                    <span className="text-white font-semibold text-lg">
                      {access.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">{access.user.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{access.user.email}</span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${getPermissionColor(access.permission)}
                      `}>
                        <Shield className="w-3 h-3 mr-1" />
                        {getPermissionLabel(access.permission)}
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>
                          追加日: {new Date(access.createdAt).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={access.permission}
                    onChange={(e) => handleUpdatePermission(access.id, e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="read">閲覧者</option>
                    <option value="write">編集者</option>
                    <option value="admin">管理者</option>
                  </select>

                  <button
                    onClick={() => handleRemoveUser(access.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="アクセス権限を削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || permissionFilter !== 'all' 
                ? '条件に一致するユーザーが見つかりません' 
                : 'アクセス権限を持つユーザーがいません'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || permissionFilter !== 'all'
                ? '検索条件を変更してお試しください'
                : 'チャットボットを利用するユーザーを招待してください'
              }
            </p>
            {!searchQuery && permissionFilter === 'all' && (
              <button
                onClick={() => setIsInviting(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>最初のユーザーを招待</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 権限説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">権限レベルについて</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-900">閲覧者</h4>
            </div>
            <p className="text-sm text-green-800">
              チャットボットの利用のみ可能。設定の閲覧・変更はできません。
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Edit className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-900">編集者</h4>
            </div>
            <p className="text-sm text-blue-800">
              チャットボットの利用と基本設定の変更が可能。ユーザー管理はできません。
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-red-600" />
              <h4 className="font-medium text-red-900">管理者</h4>
            </div>
            <p className="text-sm text-red-800">
              すべての操作が可能。ユーザー管理、削除、セキュリティ設定なども含みます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPanel;