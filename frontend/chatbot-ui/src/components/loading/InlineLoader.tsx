import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface InlineLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  className?: string;
}

const InlineLoader: React.FC<InlineLoaderProps> = ({
  message = '読み込み中...',
  size = 'sm',
  color = 'primary',
  className = ''
}) => {
  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <LoadingSpinner size={size} color={color} />
      {message && (
        <span className="text-sm text-gray-600 font-medium">
          {message}
        </span>
      )}
    </div>
  );
};

export default InlineLoader;