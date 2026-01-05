import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface ModernButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'rectangle' | 'rounded' | 'pill' | 'circle';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right' | 'only';
  animation?: 'none' | 'pulse' | 'bounce' | 'shake';
  fullWidth?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const ModernButton: React.FC<ModernButtonProps> = ({
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  loading = false,
  icon,
  iconPosition = 'left',
  animation = 'none',
  fullWidth = false,
  disabled = false,
  children,
  onClick,
  className = '',
  type = 'button'
}) => {
  const variants = {
    primary: 'bg-primary-gradient text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 shadow-sm',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 border border-slate-300',
    danger: 'bg-danger-gradient text-white shadow-lg hover:shadow-xl',
    success: 'bg-secondary-gradient text-white shadow-lg hover:shadow-xl',
    warning: 'bg-accent-gradient text-white shadow-lg hover:shadow-xl',
    error: 'bg-danger-gradient text-white shadow-lg hover:shadow-xl'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
    xl: 'px-8 py-5 text-xl'
  };

  const shapes = {
    rectangle: 'rounded-none',
    rounded: 'rounded-xl',
    pill: 'rounded-full',
    circle: 'rounded-full aspect-square'
  };

  const animations = {
    none: {},
    pulse: { scale: [1, 1.05, 1] },
    bounce: { y: [0, -5, 0] },
    shake: { x: [-2, 2, -2, 2, 0] }
  };

  const handleClick = () => {
    if (!loading && !disabled && onClick) {
      onClick();
    }
  };

  const buttonContent = (
    <div className="flex items-center justify-center gap-2">
      {icon && iconPosition === 'left' && !loading && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {iconPosition !== 'only' && <span>{children}</span>}
      {icon && iconPosition === 'right' && !loading && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </div>
  );

  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      animate={animation !== 'none' ? animations[animation] : {}}
      transition={{ duration: 0.3, repeat: animation === 'pulse' || animation === 'bounce' ? Infinity : 0 }}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className={cn(
        variants[variant],
        sizes[size],
        shapes[shape],
        fullWidth ? 'w-full' : '',
        disabled || loading ? 'opacity-50 cursor-not-allowed' : '',
        'font-medium transition-all duration-300 focus-ring-modern',
        className
      )}
      onClick={handleClick}
    >
      {buttonContent}
    </motion.button>
  );
};

export default ModernButton;
