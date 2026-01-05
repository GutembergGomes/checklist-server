import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface ModernCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'neumorphic' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animation?: 'none' | 'fadeIn' | 'slideUp' | 'scale';
  hover?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const ModernCard: React.FC<ModernCardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  borderRadius = 'xl',
  animation = 'fadeIn',
  hover = false,
  className = '',
  onClick,
  disabled = false
}) => {
  const variants = {
    default: 'bg-white border border-slate-200 shadow-card',
    glass: 'glassmorphism',
    neumorphic: 'neumorphism',
    elevated: 'bg-white shadow-lg border border-slate-100'
  };

  const paddings = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const borderRadii = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };

  const animations = {
    none: {},
    fadeIn: { opacity: [0, 1], scale: [0.95, 1] },
    slideUp: { opacity: [0, 1], y: [20, 0] },
    scale: { opacity: [0, 1], scale: [0.9, 1] }
  };

  const hoverEffects = hover && !disabled ? 'hover-lift cursor-pointer' : '';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <motion.div
      initial={animation !== 'none' ? animations[animation] : false}
      animate={animation !== 'none' ? { opacity: 1, scale: 1, y: 0 } : false}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={hover && !disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={hover && !disabled ? { scale: 0.98 } : {}}
      className={cn(
        variants[variant],
        paddings[padding],
        borderRadii[borderRadius],
        hoverEffects,
        disabledStyles,
        className
      )}
      onClick={!disabled ? onClick : undefined}
    >
      {children}
    </motion.div>
  );
};

export default ModernCard;