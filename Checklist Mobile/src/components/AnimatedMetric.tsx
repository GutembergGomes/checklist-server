import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { countVariants, floatingAnimation } from '../lib/animations';

interface AnimatedMetricProps {
  value: number;
  label: string;
  icon: React.ReactNode;
  unit?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  className?: string;
  animateOnMount?: boolean;
}

const colorClasses = {
  primary: 'text-primary-600 bg-primary-100',
  success: 'text-success-600 bg-success-100',
  warning: 'text-warning-600 bg-warning-100',
  error: 'text-error-600 bg-error-100',
  info: 'text-info-600 bg-info-100'
};

const trendIcons = {
  up: '↑',
  down: '↓',
  stable: '→'
};

const AnimatedMetric: React.FC<AnimatedMetricProps> = ({
  value,
  label,
  icon,
  unit = '',
  color = 'primary',
  trend,
  trendValue,
  className = '',
  animateOnMount = true
}) => {
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (animateOnMount || value !== displayValue) {
      setIsAnimating(true);
      const duration = 1500; // 1.5 seconds
      const startTime = Date.now();
      const startValue = animateOnMount ? 0 : displayValue;
      const endValue = value;
      
      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = startValue + (endValue - startValue) * easeOutQuart;
        
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [value, animateOnMount, displayValue]);

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return Math.round(val).toString();
  };

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 backdrop-blur-sm',
        'bg-white/70 border border-white/20 shadow-lg',
        'transition-all duration-300 hover:shadow-xl hover:scale-105',
        className
      )}
      variants={countVariants}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background gradient effect */}
      <div className={cn(
        'absolute inset-0 opacity-20',
        colorClasses[color]
      )} />
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-sm" />
      
      <div className="relative z-10">
        {/* Icon */}
        <motion.div
          className={cn(
            'inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4',
            colorClasses[color]
          )}
          variants={floatingAnimation}
          animate="animate"
        >
          {icon}
        </motion.div>
        
        {/* Value */}
        <div className="flex items-end gap-2 mb-1">
          <motion.span
            className={cn("text-3xl font-bold tabular-nums", "text-gradient")}
            key={displayValue}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {formatValue(displayValue)}
          </motion.span>
          {unit && (
            <span className="text-sm font-medium text-gray-600 mb-1">
              {unit}
            </span>
          )}
        </div>
        
        {/* Label */}
        <p className="text-sm font-medium text-gray-700 mb-2">
          {label}
        </p>
        
        {/* Trend */}
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend === 'up' ? 'text-success-600' :
            trend === 'down' ? 'text-error-600' :
            'text-gray-600'
          )}>
            <span>{trendIcons[trend]}</span>
            {trendValue && <span>{trendValue}%</span>}
            <span className="text-gray-500">vs ontem</span>
          </div>
        )}
      </div>
      
      {/* Animated border */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-2xl border-2 opacity-0',
          isAnimating ? 'opacity-100' : ''
        )}
        animate={{
          borderColor: isAnimating ? ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'] : '#e5e7eb'
        }}
        transition={{
          duration: 2,
          repeat: isAnimating ? Infinity : 0,
          ease: "linear"
        }}
      />
    </motion.div>
  );
};

export default AnimatedMetric;
