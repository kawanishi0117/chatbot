import {
	AlertTriangle,
	CheckCircle,
	Info,
	X,
	XCircle,
} from 'lucide-react';
import React, { useEffect } from 'react';
import { AlertConfig, AlertType } from '../contexts/AlertContext';

interface AlertModalProps {
  config: AlertConfig;
  onClose: (result: boolean) => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ config, onClose }) => {
  const { type, title, message, alertType = 'info', confirmText = 'OK', cancelText = 'キャンセル' } = config;

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Get icon, colors, and styles based on alert type
  const getAlertStyles = (alertType: AlertType) => {
    switch (alertType) {
      case 'error':
        return {
          icon: XCircle,
          iconColor: 'text-red-500',
          titleColor: 'text-red-600',
          buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          messageBg: 'bg-red-50 border-red-200 text-red-800',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          titleColor: 'text-amber-600',
          buttonColor: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
          messageBg: 'bg-amber-50 border-amber-200 text-amber-800',
        };
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-emerald-500',
          titleColor: 'text-emerald-600',
          buttonColor: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
          messageBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconColor: 'text-blue-500',
          titleColor: 'text-blue-600',
          buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          messageBg: 'bg-blue-50 border-blue-200 text-blue-800',
        };
    }
  };

  const styles = getAlertStyles(alertType);
  const IconComponent = styles.icon;

  const handleConfirm = () => {
    onClose(true);
  };

  const handleCancel = () => {
    onClose(false);
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleOverlayClick}
      />

      {/* モーダルコンテンツ */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto">
        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={handleCancel}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* メインコンテンツ */}
        <div className="p-6 sm:p-8 pt-8 sm:pt-10">
          {/* タイトルとアイコン */}
          <div className="flex items-center justify-start mb-6 ms-2">
            <IconComponent className={`w-6 h-6 ${styles.iconColor} mr-2`} />
            {title ? (
              <h3 className={`text-lg sm:text-xl font-bold ${styles.titleColor}`}>
                {title}
              </h3>
            ) : (
              <h3 className={`text-lg sm:text-xl font-bold ${styles.titleColor}`}>
                {alertType === 'error' ? 'エラー' : 
                 alertType === 'warning' ? '警告' : 
                 alertType === 'success' ? '成功' : '情報'}
              </h3>
            )}
          </div>

          {/* メッセージ */}
          <div className={`p-4 mb-6 border ${styles.messageBg}`}>
            <p className="text-sm sm:text-base whitespace-pre-wrap text-center leading-relaxed">
              {message}
            </p>
          </div>

          {/* ボタン */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            {type === 'confirm' && (
              <button
                type="button"
                onClick={handleCancel}
                className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors cursor-pointer order-2 sm:order-1"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className={`w-full sm:w-auto px-6 py-3 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors cursor-pointer ${styles.buttonColor} ${type === 'confirm' ? 'order-1 sm:order-2' : ''}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;