import React, { useState } from 'react';
import { 
  Webhook, 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink, 
  CheckCircle, 
  XCircle,
  Copy,
  Eye,
  EyeOff,
  Save,
  AlertTriangle
} from 'lucide-react';
import { WebhookConfig, ChatbotConfig } from '../types';

interface WebhookPanelProps {
  chatbot: ChatbotConfig;
  onSave: (webhooks: WebhookConfig[]) => void;
}

const WebhookPanel: React.FC<WebhookPanelProps> = ({ chatbot, onSave }) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    {
      id: '1',
      chatbotId: chatbot.id,
      url: 'https://api.example.com/webhook/chatbot',
      events: ['message_received', 'conversation_started'],
      secret: 'wh_secret_abc123xyz789',
      isActive: true,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      chatbotId: chatbot.id,
      url: 'https://slack.example.com/hooks/webhook',
      events: ['message_received'],
      secret: 'wh_secret_def456uvw012',
      isActive: false,
      createdAt: '2024-01-14T16:20:00Z',
      updatedAt: '2024-01-14T16:20:00Z'
    }
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});

  const availableEvents = [
    { id: 'message_received', label: 'メッセージ受信', description: 'ユーザーからメッセージを受信したとき' },
    { id: 'conversation_started', label: '会話開始', description: '新しい会話が開始されたとき' },
    { id: 'conversation_ended', label: '会話終了', description: '会話が終了したとき' },
    { id: 'user_feedback', label: 'ユーザーフィードバック', description: 'ユーザーがフィードバックを送信したとき' },
    { id: 'error_occurred', label: 'エラー発生', description: 'システムでエラーが発生したとき' }
  ];

  const toggleSecret = (webhookId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [webhookId]: !prev[webhookId]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // ここで実際のアプリではtoast通知などを表示
  };

  const handleToggleWebhook = (webhookId: string) => {
    setWebhooks(prev => 
      prev.map(webhook => 
        webhook.id === webhookId 
          ? { ...webhook, isActive: !webhook.isActive }
          : webhook
      )
    );
  };

  const handleDeleteWebhook = (webhookId: string) => {
    setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
  };

  const WebhookForm: React.FC<{ webhook?: WebhookConfig; onSave: (webhook: Partial<WebhookConfig>) => void; onCancel: () => void }> = ({ 
    webhook, 
    onSave, 
    onCancel 
  }) => {
    const [formData, setFormData] = useState({
      url: webhook?.url || '',
      events: webhook?.events || [],
      secret: webhook?.secret || `wh_secret_${Math.random().toString(36).substr(2, 16)}`,
      isActive: webhook?.isActive || true
    });

    const handleEventToggle = (eventId: string) => {
      setFormData(prev => ({
        ...prev,
        events: prev.events.includes(eventId)
          ? prev.events.filter(e => e !== eventId)
          : [...prev.events, eventId]
      }));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {webhook ? 'Webhook編集' : '新しいWebhook'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://your-domain.com/webhook"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              イベント選択
            </label>
            <div className="space-y-3">
              {availableEvents.map(event => (
                <label key={event.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event.id)}
                    onChange={() => handleEventToggle(event.id)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{event.label}</div>
                    <div className="text-sm text-gray-600">{event.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              シークレットキー
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.secret}
                onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  secret: `wh_secret_${Math.random().toString(36).substr(2, 16)}` 
                }))}
                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                再生成
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">有効にする</span>
            </label>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              保存
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
            <Webhook className="w-8 h-8" />
            <span>Webhook設定</span>
          </h1>
          <p className="text-gray-600 mt-1">
            外部システムとの連携用Webhookを設定・管理します
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>新しいWebhook</span>
        </button>
      </div>

      {/* 新規作成フォーム */}
      {isCreating && (
        <WebhookForm
          onSave={(webhookData) => {
            const newWebhook: WebhookConfig = {
              id: Date.now().toString(),
              chatbotId: chatbot.id,
              ...webhookData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } as WebhookConfig;
            setWebhooks(prev => [...prev, newWebhook]);
            setIsCreating(false);
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* 編集フォーム */}
      {editingWebhook && (
        <WebhookForm
          webhook={editingWebhook}
          onSave={(webhookData) => {
            setWebhooks(prev => prev.map(w => 
              w.id === editingWebhook.id 
                ? { ...w, ...webhookData, updatedAt: new Date().toISOString() }
                : w
            ));
            setEditingWebhook(null);
          }}
          onCancel={() => setEditingWebhook(null)}
        />
      )}

      {/* Webhookリスト */}
      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <div key={webhook.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-lg
                    ${webhook.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}
                  `}>
                    <Webhook className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{webhook.url}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${webhook.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                        }
                      `}>
                        {webhook.isActive ? 'アクティブ' : '停止中'}
                      </span>
                      <span className="text-xs text-gray-500">
                        作成: {new Date(webhook.createdAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">監視イベント</h4>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map(eventId => {
                        const event = availableEvents.find(e => e.id === eventId);
                        return (
                          <span key={eventId} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                            {event?.label || eventId}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">シークレットキー</h4>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                        {showSecrets[webhook.id] ? webhook.secret : '••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => toggleSecret(webhook.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showSecrets[webhook.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(webhook.secret)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <a
                  href={webhook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="URLを開く"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setEditingWebhook(webhook)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="編集"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleWebhook(webhook.id)}
                  className={`p-2 transition-colors ${
                    webhook.isActive 
                      ? 'text-red-400 hover:text-red-600' 
                      : 'text-green-400 hover:text-green-600'
                  }`}
                  title={webhook.isActive ? '無効にする' : '有効にする'}
                >
                  {webhook.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDeleteWebhook(webhook.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {webhooks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Webhook className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Webhookが設定されていません</h3>
            <p className="text-gray-600 mb-4">外部システムとの連携を開始するには、Webhookを追加してください</p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>最初のWebhookを作成</span>
            </button>
          </div>
        )}
      </div>

      {/* 設定説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <AlertTriangle className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Webhookについて</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• Webhookを使用して、チャットボットのイベントを外部システムに通知できます</p>
              <p>• HTTPSエンドポイントが必要です（HTTP非対応）</p>
              <p>• シークレットキーを使用してリクエストの真正性を検証してください</p>
              <p>• ペイロードはJSON形式で送信されます</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookPanel;