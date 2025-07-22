import { Rocket, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
    BotSettings,
    BotSettingsCreateRequest,
    BotSettingsUpdateRequest
} from '../types';

interface BotFormProps {
  isOpen: boolean;
  bot: BotSettings | null; // nullの場合は新規作成
  currentUserId: string;
  onClose: () => void;
  onSubmit: (data: BotSettingsCreateRequest | BotSettingsUpdateRequest) => void;
}

interface FormData {
  botName: string;
  description: string;
  isActive: boolean;
}

interface FormErrors {
  botName?: string;
  description?: string;
  general?: string;
}

const BotForm: React.FC<BotFormProps> = ({
  isOpen,
  bot,
  currentUserId,
  onClose,
  onSubmit
}) => {
  // フォームデータの状態管理
  const [formData, setFormData] = useState<FormData>({
    botName: '',
    description: '',
    isActive: true,
  });

  // エラー状態
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 編集モードかどうか
  const isEditMode = bot !== null;

  // フォームデータの初期化（編集時）
  useEffect(() => {
    if (isOpen) {
      if (bot) {
        // 編集モード
        setFormData({
          botName: bot.botName,
          description: bot.description,
          isActive: bot.isActive,
        });
      } else {
        // 新規作成モード
        setFormData({
          botName: '',
          description: '',
          isActive: true,
        });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, bot]);

  // バリデーション関数
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // ボット名のバリデーション
    if (!formData.botName.trim()) {
      newErrors.botName = 'ボット名は必須です';
    } else if (formData.botName.length < 1 || formData.botName.length > 100) {
      newErrors.botName = 'ボット名は1文字以上100文字以内で入力してください';
    }

    // 説明のバリデーション
    if (formData.description.length > 500) {
      newErrors.description = '説明は500文字以内で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (isEditMode) {
        // 更新処理
        const updateData: BotSettingsUpdateRequest = {
          botName: formData.botName.trim(),
          description: formData.description.trim(),
          isActive: formData.isActive,
        };
        await onSubmit(updateData);
      } else {
        // 作成処理
        const createData: BotSettingsCreateRequest = {
          botName: formData.botName.trim(),
          description: formData.description.trim(),
          creatorId: currentUserId,
          isActive: formData.isActive,
        };
        await onSubmit(createData);
      }
    } catch (error) {
      setErrors({ general: '処理中にエラーが発生しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 入力値変更処理
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    // エラーをクリア
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // モーダルが開いていない場合は何も表示しない
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* オーバーレイ */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* モーダルコンテンツ */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Rocket className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isEditMode ? 'ボット設定の編集' : '新しいボットを作成'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                              <X className="w-6 h-6" />
            </button>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 全体エラーメッセージ */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            )}

            {/* ボット名 */}
            <div>
              <label htmlFor="botName" className="block text-sm font-medium text-gray-700 mb-2">
                ボット名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="botName"
                name="botName"
                value={formData.botName}
                onChange={handleInputChange}
                placeholder="例: サポートボット"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.botName
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                disabled={isSubmitting}
                maxLength={100}
              />
              {errors.botName && (
                <p className="mt-1 text-sm text-red-600">{errors.botName}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.botName.length}/100文字
              </p>
            </div>

            {/* 説明 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="ボットの目的や機能について説明してください（任意）"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical ${
                  errors.description
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                disabled={isSubmitting}
                maxLength={500}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.description.length}/500文字
              </p>
            </div>

            {/* アクティブ状態 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                ボットをアクティブ状態にする
              </label>
            </div>

            {/* 作成者情報（新規作成時のみ） */}
            {!isEditMode && (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>作成者:</strong> {currentUserId}
                </p>
              </div>
            )}

            {/* ボタン */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    {isEditMode ? '更新する' : '作成する'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BotForm; 