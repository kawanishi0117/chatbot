import { Bot, Save, X } from 'lucide-react';
import React, { useState } from 'react';

interface SimpleBotFormProps {
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
}

const SimpleBotForm: React.FC<SimpleBotFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const [errors, setErrors] = useState({
    name: '',
    description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // エラーをクリア
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {
      name: '',
      description: ''
    };

    if (!formData.name.trim()) {
      newErrors.name = 'ボット名は必須です';
    } else if (formData.name.length > 100) {
      newErrors.name = 'ボット名は100文字以内で入力してください';
    }

    if (formData.description.length > 500) {
      newErrors.description = '説明は500文字以内で入力してください';
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.description;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        name: formData.name.trim(),
        description: formData.description.trim()
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">新しいボットの情報</h2>
            <p className="text-sm text-gray-500">ボットの基本情報を入力してください</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ボット名 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              ボット名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="例: カスタマーサポートボット"
              className={`
                w-full px-4 py-3 rounded-lg border transition-colors
                ${errors.name 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-offset-0
              `}
              maxLength={100}
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-600">{errors.name}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {formData.name.length}/100文字
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
              onChange={handleChange}
              rows={4}
              placeholder="ボットの目的や機能について説明してください（任意）"
              className={`
                w-full px-4 py-3 rounded-lg border transition-colors resize-none
                ${errors.description 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-offset-0
              `}
              maxLength={500}
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {formData.description.length}/500文字
            </p>
          </div>

          {/* 情報メッセージ */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ボット作成後、GitHub連携やS3設定などの詳細設定を行うことができます。
            </p>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              ボットを作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleBotForm; 