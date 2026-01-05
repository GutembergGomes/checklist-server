import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'button';
  width?: string;
  height?: string;
  lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'bg-gray-200 rounded animate-shimmer';
  
  const variantClasses = {
    text: 'h-4 rounded',
    rect: 'rounded',
    circle: 'rounded-full',
    card: 'rounded-xl',
    button: 'rounded-xl'
  };

  const getDimensions = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = width;
    if (height) style.height = height;
    return style;
  };

  if (variant === 'card') {
    return (
      <div className={`p-4 space-y-3 ${className}`}>
        <div className={`${baseClasses} h-4 w-3/4 rounded`} />
        <div className={`${baseClasses} h-3 w-full rounded`} />
        <div className={`${baseClasses} h-3 w-5/6 rounded`} />
        <div className="flex gap-2 mt-4">
          <div className={`${baseClasses} h-8 w-16 rounded-xl`} />
          <div className={`${baseClasses} h-8 w-20 rounded-xl`} />
        </div>
      </div>
    );
  }

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              ...getDimensions(),
              width: width || (index === lines - 1 ? '75%' : '100%')
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={getDimensions()}
    />
  );
};

// Skeleton loading components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${className}`}>
    <div className="flex items-center gap-4 mb-4">
      <Skeleton variant="circle" width="48px" height="48px" />
      <div className="flex-1">
        <Skeleton width="60%" className="mb-2" />
        <Skeleton width="80%" />
      </div>
    </div>
    <Skeleton lines={2} />
    <div className="flex gap-2 mt-4">
      <Skeleton variant="button" width="60px" height="32px" />
      <Skeleton variant="button" width="80px" height="32px" />
    </div>
  </div>
);

export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({ 
  count = 3, 
  className = '' 
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </div>
);

export const SkeletonForm: React.FC<{ fields?: number; className?: string }> = ({ 
  fields = 3, 
  className = '' 
}) => (
  <div className={`space-y-6 ${className}`}>
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index}>
        <Skeleton width="30%" className="mb-2" />
        <Skeleton height="48px" />
      </div>
    ))}
    <Skeleton variant="button" height="48px" width="100%" />
  </div>
);

export default Skeleton;