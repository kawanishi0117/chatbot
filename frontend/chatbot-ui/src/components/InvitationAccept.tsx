import { CheckCircle, Mail, Shield, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAlert } from '../contexts/AlertContext';
import { api } from '../services/api';
import { LoadingOverlay } from './loading';

interface InvitationInfo {
  invitationId: string;
  botId: string;
  email: string;
  permission: string;
  inviterEmail: string;
  createdAt: number;
  expiresAt: number;
}

const InvitationAccept: React.FC = () => {
  const { invitationId } = useParams<{ invitationId: string }>();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showAlert } = useAlert();

  useEffect(() => {
    const loadInvitation = async () => {
      if (!invitationId) {
        setError('無効な招待リンクです');
        setIsLoading(false);
        return;
      }

      try {
        const invitationData = await api.getInvitation(invitationId);
        setInvitation(invitationData);
      } catch (error: any) {
        console.error('Failed to load invitation:', error);
        if (error.message.includes('410')) {
          setError('この招待リンクは既に使用されているか、有効期限が切れています');
        } else if (error.message.includes('404')) {
          setError('招待が見つかりません');
        } else {
          setError('招待情報の取得に失敗しました: ' + error.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadInvitation();
  }, [invitationId]);

  const handleAcceptInvitation = async () => {
    if (!invitationId) return;

    try {
      setIsAccepting(true);
      await api.acceptInvitation(invitationId);
      setIsAccepted(true);
      showAlert('招待を受諾しました！ボットにアクセスできるようになりました。', 'success');
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      if (error.message.includes('410')) {
        setError('この招待リンクは既に使用されているか、有効期限が切れています');
      } else {
        showAlert('招待の受諾に失敗しました: ' + error.message, 'error');
      }
    } finally {
      setIsAccepting(false);
    }
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'admin': return '管理者';
      case 'write': return '編集者';
      case 'read': return '閲覧者';
      default: return permission;
    }
  };

  const getPermissionDescription = (permission: string) => {
    switch (permission) {
      case 'admin': return 'すべての設定変更、ユーザー管理、ボットの削除が可能';
      case 'write': return 'ボット設定の変更、コンテンツの編集が可能';
      case 'read': return 'ボットとの会話のみ可能（設定変更は不可）';
      default: return '';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingOverlay isVisible={true} message="招待情報を読み込み中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">招待エラー</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ボットにアクセスできるようになりました！
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            招待が正常に受諾されました。ボットとの会話を開始できます。
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">付与された権限</h3>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                {getPermissionLabel(invitation?.permission || 'read')}
              </span>
            </div>
            <p className="text-sm text-blue-700">
              {getPermissionDescription(invitation?.permission || 'read')}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              チャットを開始
            </button>
            <p className="text-sm text-gray-500">
              ※ 管理画面へのアクセスは制限されています
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {isAccepting && <LoadingOverlay isVisible={true} message="招待を受諾中..." />}
      
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ボットへの招待</h1>
          <p className="text-gray-600">
            あなたがボットへアクセスするために招待されました
          </p>
        </div>

        {invitation && (
          <div className="space-y-6">
            {/* 招待情報 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">招待の詳細</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">招待者</p>
                    <p className="font-medium text-gray-900">{invitation.inviterEmail}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">付与される権限</p>
                    <p className="font-medium text-gray-900">
                      {getPermissionLabel(invitation.permission)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {getPermissionDescription(invitation.permission)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a4 4 0 118 0v4m-4 0v6m-4-6V7a4 4 0 118 0v4" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600">有効期限</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(invitation.expiresAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">ご注意</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• この招待リンクは一度のみ使用可能です</li>
                <li>• 招待を受諾すると、指定された権限レベルでボットにアクセスできます</li>
                <li>• 管理画面へのアクセスは制限されています</li>
              </ul>
            </div>

            {/* アクションボタン */}
            <div className="space-y-3">
              <button
                onClick={handleAcceptInvitation}
                disabled={isAccepting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isAccepting ? '招待を受諾中...' : '招待を受諾する'}
              </button>
              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                戻る
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationAccept; 