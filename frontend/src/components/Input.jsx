import React from 'react';

const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder = '',
  required = false,
  error = '',
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-3 rounded-xl text-sm glass-input placeholder-gray-500 font-medium transition-all ${
          error ? 'border-red-500/50 focus:border-red-500 focus:box-shadow-red' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
    </div>
  );
};

export default Input;
