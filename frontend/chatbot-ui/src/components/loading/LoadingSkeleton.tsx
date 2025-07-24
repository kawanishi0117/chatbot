import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = ''
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';

  const getSkeletonElement = () => {
    const style = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height
    };

    switch (variant) {
      case 'text':
        if (lines > 1) {
          return (
            <div className={`space-y-2 ${className}`}>
              {Array.from({ length: lines }).map((_, index) => (
                <div
                  key={index}
                  className={`${baseClasses} h-4`}
                  style={{
                    width: index === lines - 1 ? '75%' : '100%',
                    ...style
                  }}
                />
              ))}
            </div>
          );
        }
        return (
          <div
            className={`${baseClasses} h-4 ${className}`}
            style={style}
          />
        );

      case 'rectangular':
        return (
          <div
            className={`${baseClasses} ${className}`}
            style={{ width: width || '100%', height: height || '200px', ...style }}
          />
        );

      case 'circular':
        const size = width || height || '40px';
        return (
          <div
            className={`${baseClasses} rounded-full ${className}`}
            style={{ width: size, height: size }}
          />
        );

      case 'card':
        return (
          <div className={`${className}`}>
            <div className={`${baseClasses} h-48 mb-4`} />
            <div className={`${baseClasses} h-4 mb-2`} />
            <div className={`${baseClasses} h-4 w-3/4`} />
          </div>
        );

      default:
        return (
          <div
            className={`${baseClasses} ${className}`}
            style={style}
          />
        );
    }
  };

  return getSkeletonElement();
};

export default LoadingSkeleton;