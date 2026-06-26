import React from 'react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  onClick,
  disabled = false,
  className = '',
}) => {
  const baseStyle = 'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer select-none flex items-center justify-center';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 border-blue-500/20 text-white shadow-lg shadow-blue-500/10 active:scale-95',
    secondary: 'bg-white/5 hover:bg-white/10 border-white/10 text-white hover:text-white active:scale-95',
    danger: 'bg-red-600/15 hover:bg-red-600/25 border-red-500/20 text-red-400 active:scale-95',
    success: 'bg-emerald-600/15 hover:bg-emerald-600/25 border-emerald-500/20 text-emerald-400 active:scale-95',
  };

  const disabledStyle = 'opacity-50 cursor-not-allowed pointer-events-none';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? disabledStyle : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
