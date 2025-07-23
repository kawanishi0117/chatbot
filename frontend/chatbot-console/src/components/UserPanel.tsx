import {
	Calendar,
	Edit,
	Eye,
	Filter,
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
  const [editingUser, setEditingUser] = useState<any>(null);

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

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    // デモ用の招待処理
    console.log('User invited');
    setIsInviting(false);
  };

  const handleViewUser = (user: User) => {
    // デモ用のユーザー詳細表示
    console.log('View user:', user);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
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
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
            <p className="text-gray-600 mt-1">
              {chatbot.name} へのアクセス権限を管理してください
            </p>
          </div>
          
          <button
            onClick={() => setIsInviting(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>ユーザーを招待</span>
          </button>
        </div>

        {/* 検索とフィルター */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ユーザー名またはメールアドレスで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={permissionFilter}
                onChange={(e) => setPermissionFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべての権限</option>
                <option value="admin">管理者</option>
                <option value="write">編集者</option>
                <option value="read">閲覧者</option>
              </select>
            </div>
          </div>
        </div>

        {/* ユーザー招待フォーム */}
        {isInviting && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">新しいユーザーを招待</h3>
              <button
                onClick={() => setIsInviting(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    権限レベル
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="read">閲覧者</option>
                    <option value="write">編集者</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsInviting(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  招待を送信
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ユーザー一覧 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">アクセス権を持つユーザー</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredUsers.length}名のユーザーがアクセス権を持っています
                </p>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredUsers.map((userAccess) => (
              <div key={userAccess.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-blue-600">
                        {userAccess.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{userAccess.user.name}</h4>
                      <p className="text-sm text-gray-600">{userAccess.user.email}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionColor(userAccess.permission)}`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {getPermissionLabel(userAccess.permission)}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(userAccess.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingUser(userAccess)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="編集"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleViewUser(userAccess.user)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="詳細"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveUser(userAccess.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">ユーザーが見つかりません</p>
              <p className="text-sm">検索条件を変更してお試しください</p>
            </div>
          )}
        </div>

        {/* 権限レベルの説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">権限レベルについて</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start space-x-2">
              <span className="font-medium">管理者:</span>
              <span>すべての設定変更、ユーザー管理、ボットの削除が可能</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium">編集者:</span>
              <span>ボット設定の変更、コンテンツの編集が可能</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium">閲覧者:</span>
              <span>ボットとの会話のみ可能（設定変更は不可）</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPanel;