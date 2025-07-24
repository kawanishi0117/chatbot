import React, { useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  XCircle,
} from 'lucide-react';
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

  // Get icon and colors based on alert type
  const getAlertStyles = (alertType: AlertType) => {
    switch (alertType) {
      case 'error':
        return {
          icon: XCircle,
          iconBgColor: 'bg-red-100',
          iconColor: 'text-red-600',
          borderColor: 'border-red-200',
          bgColor: 'bg-red-50',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBgColor: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          borderColor: 'border-yellow-200',
          bgColor: 'bg-yellow-50',
        };
      case 'success':
        return {
          icon: CheckCircle,
          iconBgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          borderColor: 'border-green-200',
          bgColor: 'bg-green-50',
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconBgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-200',
          bgColor: 'bg-blue-50',
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
        onClick={handleOverlayClick}
      >
        {/* オーバーレイ */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        {/* モーダルコンテンツ */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
          {/* ヘッダー */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full ${styles.iconBgColor}`}>
                <IconComponent className={`h-6 w-6 ${styles.iconColor}`} />
              </div>
              {title && (
                <h3 className="ml-3 text-lg leading-6 font-medium text-gray-900">
                  {title}
                </h3>
              )}
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* メッセージ */}
          <div className="mt-3">
            <div className={`rounded-md p-4 ${styles.bgColor} ${styles.borderColor} border`}>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {message}
              </p>
            </div>
          </div>

          {/* ボタン */}
          <div className="mt-6 flex justify-end space-x-3">
            {type === 'confirm' && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                alertType === 'error'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : alertType === 'warning'
                  ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                  : alertType === 'success'
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
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