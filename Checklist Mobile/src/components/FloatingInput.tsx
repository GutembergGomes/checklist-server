import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface FloatingInputProps {
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  validation?: 'success' | 'warning' | 'error';
  className?: string;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = ' ',
  error,
  helperText,
  required = false,
  disabled = false,
  icon,
  action,
  validation,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value && value.length > 0;
  const shouldFloat = isFocused || hasValue;

  const getBorderColor = () => {
    if (error || validation === 'error') return 'border-red-500 focus:border-red-500';
    if (validation === 'warning') return 'border-yellow-500 focus:border-yellow-500';
    if (validation === 'success') return 'border-green-500 focus:border-green-500';
    if (isFocused) return 'border-blue-500';
    return 'border-slate-300 focus:border-blue-500';
  };

  const getLabelColor = () => {
    if (error || validation === 'error') return 'text-red-600';
    if (validation === 'warning') return 'text-yellow-600';
    if (validation === 'success') return 'text-green-600';
    if (isFocused) return 'text-blue-600';
    return 'text-slate-500';
  };

  const getBackgroundColor = () => {
    if (disabled) return 'bg-slate-100';
    if (isFocused) return 'bg-white';
    return 'bg-slate-50';
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-slate-400">
            {icon}
          </div>
        )}
        
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-3 bg-slate-50 border-2 rounded-xl',
            'focus:outline-none transition-all duration-300',
            'placeholder-transparent peer',
            icon ? 'pl-10' : 'pl-4',
            action ? 'pr-12' : 'pr-4',
            getBorderColor(),
            getBackgroundColor(),
            disabled ? 'cursor-not-allowed' : '',
            'focus:ring-2 focus:ring-opacity-50'
          )}
        />
        
        <label
          className={cn(
            'absolute left-4 transition-all duration-300 pointer-events-none',
            'bg-white px-2 rounded-md z-10',
            icon ? 'left-10' : 'left-4',
            shouldFloat ? '-top-2.5 text-xs' : 'top-3.5 text-base',
            getLabelColor(),
            disabled ? 'text-slate-400' : '',
            'peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base',
            'peer-focus:-top-2.5 peer-focus:text-xs',
            error || validation === 'error' ? 'peer-focus:text-red-600' : 
            validation === 'warning' ? 'peer-focus:text-yellow-600' :
            validation === 'success' ? 'peer-focus:text-green-600' :
            'peer-focus:text-blue-600'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {action && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            {action}
          </div>
        )}
      </div>

      <AnimatePresence>
        {(error || helperText) && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'mt-1 text-sm animate-slide-up',
              error ? 'text-red-600' : 
              validation === 'warning' ? 'text-yellow-600' :
              validation === 'success' ? 'text-green-600' :
              'text-slate-600'
            )}
          >
            {error || helperText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingInput;