import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AnimatedBadgeProps {
  count?: number;
  type?: 'sync' | 'notification' | 'status';
  variant?: 'default' | 'success' | 'warning' | 'error';
  icon?: LucideIcon;
  pulse?: boolean;
  bounce?: boolean;
  className?: string;
}

const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  count,
  type = 'status',
  variant = 'default',
  icon: Icon,
  pulse = false,
  bounce = false,
  className = ''
}) => {
  const variants = {
    default: 'bg-blue-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-500 text-white'
  };

  const getAnimationClass = () => {
    if (pulse) return 'animate-pulse';
    if (bounce) return 'animate-bounce-subtle';
    return '';
  };

  if (type === 'sync' && count && count > 0) {
    return (
      <div className={`absolute -top-2 -right-2 bg-red-500 text-white
                      text-xs rounded-full w-5 h-5 flex items-center justify-center
                      shadow-lg ${getAnimationClass()} ${className}`}>
        {count > 99 ? '99+' : count}
      </div>
    );
  }

  if (type === 'notification' && count && count > 0) {
    return (
      <div className={`absolute -top-1 -right-1 bg-red-500 text-white
                      text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center
                      px-1 shadow-lg ${getAnimationClass()} ${className}`}>
        {count > 9 ? '9+' : count}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full
                     text-xs font-medium gap-1 ${variants[variant]} ${getAnimationClass()} ${className}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {count && count > 0 && <span>{count}</span>}
    </div>
  );
};

export default AnimatedBadge;