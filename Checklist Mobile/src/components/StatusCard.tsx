import React from 'react';

interface StatusCardProps {
  title: string;
  status: 'online' | 'offline' | 'syncing' | 'error';
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  status,
  description,
  children,
  className = ''
}) => {
  const statusConfig = {
    online: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      indicator: 'bg-green-500',
      text: 'text-green-800',
      title: 'Online'
    },
    offline: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      indicator: 'bg-red-500',
      text: 'text-red-800',
      title: 'Offline'
    },
    syncing: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      indicator: 'bg-yellow-500 animate-pulse',
      text: 'text-yellow-800',
      title: 'Sincronizando'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      indicator: 'bg-red-500',
      text: 'text-red-800',
      title: 'Erro'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`rounded-2xl p-4 border-2 backdrop-blur-sm relative overflow-hidden ${config.bg} ${config.border} ${className}`}>
      {/* Indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.indicator} ${status === 'syncing' ? 'from-yellow-400 to-yellow-600' : ''}`} />
      
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-semibold ${config.text}`}>{title}</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${config.indicator}`} />
          <span className={`text-sm font-medium ${config.text}`}>{config.title}</span>
        </div>
      </div>
      
      {description && (
        <p className={`text-sm ${config.text} opacity-80 mb-3`}>{description}</p>
      )}
      
      {children}
    </div>
  );
};

export default StatusCard;