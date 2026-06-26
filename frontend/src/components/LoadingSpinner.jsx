import React from 'react';

const LoadingSpinner = ({ size = 'medium', className = '' }) => {
  const sizes = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-4',
    large: 'h-12 w-12 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} animate-spin rounded-full border-blue-500 border-t-transparent`}
      ></div>
    </div>
  );
};

export default LoadingSpinner;
