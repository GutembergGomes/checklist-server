import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EnhancedCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

const EnhancedCard: React.FC<EnhancedCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  variant = 'default',
  className = ''
}) => {
  const variants = {
    default: 'from-blue-100 to-blue-200',
    success: 'from-green-100 to-green-200',
    warning: 'from-yellow-100 to-yellow-200',
    error: 'from-red-100 to-red-200'
  };

  const iconColors = {
    default: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  };

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer bg-white rounded-2xl p-6 shadow-card border border-gray-100
                 hover:shadow-card-hover hover:border-blue-200 hover:-translate-y-1
                 transition-all duration-300 active:scale-95 ${onClick ? 'hover:cursor-pointer' : ''} ${className}`}
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${variants[variant]} rounded-xl 
                      flex items-center justify-center mb-3 group-hover:scale-110 
                      transition-transform duration-300`}>
        <Icon className={`w-6 h-6 ${iconColors[variant]}`} />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 text-subheading">{title}</h3>
      <p className="text-sm text-gray-600 text-caption">{description}</p>
    </div>
  );
};

export default EnhancedCard;