import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  backdrop?: 'light' | 'dark' | 'blur';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = '読み込み中...',
  backdrop = 'light',
  size = 'lg'
}) => {
  if (!isVisible) return null;

  const backdropClasses = {
    light: 'bg-white bg-opacity-80',
    dark: 'bg-gray-900 bg-opacity-50',
    blur: 'bg-white bg-opacity-70 backdrop-blur-sm'
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${backdropClasses[backdrop]}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-message"
    >
      <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-lg">
        <LoadingSpinner size={size} color="primary" />
        {message && (
          <p 
            id="loading-message"
            className="text-gray-700 text-sm font-medium"
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;