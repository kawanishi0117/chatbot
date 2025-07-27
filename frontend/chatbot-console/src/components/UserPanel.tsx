import {
	Calendar,
	Edit,
	Eye,
	Plus,
	Shield,
	Trash2,
	Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAlert } from '../contexts/AlertContext';
import { api } from '../services/api';
import { ChatbotConfig, UserAccess } from '../types';
import { LoadingOverlay } from './loading';

interface UserPanelProps {
  chatbot: ChatbotConfig;
  onSave: (userAccess: UserAccess[]) => void;
}

interface BotUser {
  id: string;
  chatbotId: string;
  userId: string;
  permission: 'general' | 'admin' | 'read' | 'write'; // 既存データとの互換性のため
  createdAt: number;
  updatedAt: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: number;
    updatedAt: number;
  };
}

const UserPanel: React.FC<UserPanelProps> = ({ chatbot, onSave }) => {
  const [isInviting, setIsInviting] = useState(false);
  const [editingUser, setEditingUser] = useState<BotUser | null>(null);
  const [userAccess, setUserAccess] = useState<BotUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { showAlert } = useAlert();

  // ユーザー一覧を取得
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const users = await api.getBotUsers(chatbot.id);
      setUserAccess(users);
    } catch (error: any) {
      showAlert('ユーザー一覧の取得に失敗しました: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [chatbot.id]);



  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'admin': return '管理者';
      case 'general': return '一般';
      // 既存データとの互換性のため
      case 'write': return '一般';
      case 'read': return '一般';
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

  const handleUpdatePermission = async (userId: string, newPermission: 'general' | 'admin') => {
    try {
      setIsLoading(true);
      await api.updateUserPermission(chatbot.id, userId, newPermission);
      showAlert('ユーザー権限を更新しました', 'success');
      await loadUsers(); // ユーザー一覧を再読み込み
      setEditingUser(null);
    } catch (error: any) {
      showAlert('権限更新に失敗しました: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('このユーザーのアクセス権を削除しますか？')) {
      return;
    }

    try {
      setIsLoading(true);
      await api.removeUserFromBot(chatbot.id, userId);
      showAlert('ユーザーを削除しました', 'success');
      await loadUsers(); // ユーザー一覧を再読み込み
    } catch (error: any) {
      showAlert('ユーザー削除に失敗しました: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async (email: string, permission: 'general' | 'admin') => {
    try {
      setIsLoading(true);
      const response = await api.inviteUserByEmail(chatbot.id, email, permission);
      showAlert(`${email} をボットに招待しました`, 'success');
      setIsInviting(false);
      await loadUsers(); // ユーザー一覧を再読み込み
    } catch (error: any) {
      showAlert('ユーザーの招待に失敗しました: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewUser = (user: BotUser['user']) => {
    // ユーザー詳細表示
    showAlert(`ユーザー詳細: ${user.name} (${user.email})`, 'info');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ja-JP');
  };



  const InviteUserForm: React.FC<{ onSave: (email: string, permission: 'general' | 'admin') => void; onCancel: () => void }> = ({ 
    onSave, 
    onCancel 
  }) => {
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState<'general' | 'admin'>('general');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) {
        showAlert('メールアドレスを入力してください', 'error');
        return;
      }
      onSave(email.trim(), permission);
      setEmail('');
      setPermission('general');
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ユーザーを招待</h3>
        <p className="text-sm text-gray-600 mb-4">
          メールアドレスを指定して、ユーザーをこのボットに直接招待します。
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="例: user@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              権限レベル
            </label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'general' | 'admin')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="general">一般 - チャットボットの利用</option>
              <option value="admin">管理者 - 全ての操作が可能</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">招待について</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 指定されたメールアドレスのユーザーに即座にアクセス権限が付与されます</li>
              <li>• 招待されたユーザーは次回ログイン時にボットを利用できます</li>
              <li>• メールアドレスのユーザーが登録済みである必要があります</li>
            </ul>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              ユーザーを招待
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
      <LoadingOverlay isVisible={isLoading} />
      
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





        {/* ユーザー招待フォーム */}
        {isInviting && (
          <InviteUserForm
            onSave={handleInviteUser}
            onCancel={() => setIsInviting(false)}
          />
        )}

        {/* 権限編集モーダル */}
        {editingUser && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingUser.user.name} の権限を変更
            </h3>
            <div className="space-y-3">
                                          {(['general', 'admin'] as const).map((permission) => (
                <label key={permission} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="permission"
                    value={permission}
                    checked={editingUser.permission === permission}
                    onChange={() => handleUpdatePermission(editingUser.userId, permission)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">{getPermissionLabel(permission)}</span>
                </label>
              ))}
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* ユーザー一覧 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">アクセス権を持つユーザー</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {userAccess.length}名のユーザーがアクセス権を持っています
                </p>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {userAccess.map((access) => (
              <div key={access.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-blue-600">
                        {access.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{access.user.name}</h4>
                      <p className="text-sm text-gray-600">{access.user.email}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionColor(access.permission)}`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {getPermissionLabel(access.permission)}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(access.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingUser(access)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="編集"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleViewUser(access.user)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="詳細"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveUser(access.userId)}
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
          
          {userAccess.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">ユーザーが見つかりません</p>
              <p className="text-sm">まだユーザーが追加されていません</p>
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