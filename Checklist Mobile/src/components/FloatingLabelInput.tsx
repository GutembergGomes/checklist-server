import React, { useState, useRef, useEffect } from 'react';

interface FloatingLabelInputProps {
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  success?: boolean;
  className?: string;
  id?: string;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = ' ',
  required = false,
  disabled = false,
  error,
  success = false,
  className = '',
  id
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const hasValue = value && value.length > 0;
  const shouldFloat = isFocused || hasValue;

  const getBorderColor = () => {
    if (error) return 'border-red-500 focus:border-red-500';
    if (success) return 'border-green-500 focus:border-green-500';
    if (isFocused) return 'border-blue-500';
    return 'border-gray-200 focus:border-blue-500';
  };

  const getLabelColor = () => {
    if (error) return 'text-red-600';
    if (success) return 'text-green-600';
    if (isFocused) return 'text-blue-600';
    return 'text-gray-500';
  };

  return (
    <div className={`relative mb-6 ${className}`}>
      <input
        ref={inputRef}
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl
                   focus:outline-none transition-all duration-300
                   placeholder-transparent peer
                   ${getBorderColor()}
                   ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'focus:bg-white'}
                   ${error ? 'focus:ring-red-500' : success ? 'focus:ring-green-500' : 'focus:ring-blue-500'}
                   focus:ring-2 focus:ring-opacity-50`}
      />
      
      <label
        htmlFor={inputId}
        className={`absolute left-4 transition-all duration-300 pointer-events-none
                   bg-white px-2 rounded-md
                   ${shouldFloat ? '-top-2.5 text-xs' : 'top-3.5 text-base'}
                   ${getLabelColor()}
                   ${disabled ? 'text-gray-400' : ''}
                   peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base
                   peer-focus:-top-2.5 peer-focus:text-xs
                   ${error ? 'peer-focus:text-red-600' : success ? 'peer-focus:text-green-600' : 'peer-focus:text-blue-600'}`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {error && (
        <p className="mt-1 text-sm text-red-600 animate-slide-up">
          {error}
        </p>
      )}
      
      {success && !error && (
        <p className="mt-1 text-sm text-green-600 animate-slide-up">
          ✓ Válido
        </p>
      )}
    </div>
  );
};

export default FloatingLabelInput;