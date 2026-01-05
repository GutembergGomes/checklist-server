import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { cn } from '../lib/utils';

interface SwipeableCardProps {
  children?: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onClick?: () => void;
  threshold?: number;
  className?: string;
  snapBack?: boolean;
  backgroundColor?: string;
  swipeIndicator?: {
    left?: { icon: React.ReactNode; text: string; color: string };
    right?: { icon: React.ReactNode; text: string; color: string };
  };
  title?: string;
  description?: string;
  icon?: React.ElementType;
  variant?: 'default' | 'warning' | 'success' | 'error';
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onClick,
  threshold = 100,
  className = '',
  snapBack = true,
  backgroundColor = 'white',
  swipeIndicator,
  title,
  description,
  icon,
  variant = 'default'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Motion values for tracking drag
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Transform values for visual feedback
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
  
  // Swipe indicator opacity
  const leftIndicatorOpacity = useTransform(x, [-200, -50, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 50, 200], [0, 0.5, 1]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    const velocity = Math.abs(info.velocity.x);
    const offset = info.offset.x;
    
    // Determine swipe direction based on offset and velocity
    if (Math.abs(offset) > threshold || velocity > 500) {
      if (offset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (offset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
      
      // Vertical swipes
      if (Math.abs(info.offset.y) > threshold || Math.abs(info.velocity.y) > 500) {
        if (info.offset.y < 0 && onSwipeUp) {
          onSwipeUp();
        } else if (info.offset.y > 0 && onSwipeDown) {
          onSwipeDown();
        }
      }
    }
  };

  const handleClick = () => {
    if (!isDragging && onClick) {
      onClick();
    }
  };

  const variantClasses = {
    default: 'bg-white text-slate-800 border border-slate-200',
    warning: 'bg-warning-100 text-warning-800 border border-warning-200',
    success: 'bg-success-100 text-success-800 border border-success-200',
    error: 'bg-error-100 text-error-800 border border-error-200'
  } as const;

  return (
    <div className="relative">
      {/* Swipe Indicators */}
      {swipeIndicator?.left && (
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 z-0"
          style={{ opacity: leftIndicatorOpacity }}
        >
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-r-full',
            swipeIndicator.left.color
          )}>
            {swipeIndicator.left.icon}
            <span className="text-sm font-medium">{swipeIndicator.left.text}</span>
          </div>
        </motion.div>
      )}
      
      {swipeIndicator?.right && (
        <motion.div
          className="absolute right-0 top-1/2 -translate-y-1/2 z-0"
          style={{ opacity: rightIndicatorOpacity }}
        >
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-l-full',
            swipeIndicator.right.color
          )}>
            <span className="text-sm font-medium">{swipeIndicator.right.text}</span>
            {swipeIndicator.right.icon}
          </div>
        </motion.div>
      )}

      {/* Main Card */}
      <motion.div
        ref={cardRef}
        className={cn(
          'relative z-10 select-none rounded-xl p-4',
          variantClasses[variant],
          className
        )}
        style={{
          x,
          y,
          rotate,
          opacity,
          scale,
          backgroundColor
        }}
        drag={snapBack}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      >
        {children ? (
          children
        ) : (
          <div className="flex items-start gap-3">
            {icon && (
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/60 border border-white/30">
                {React.createElement(icon)}
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-semibold">{title}</h3>}
              {description && <p className="text-sm text-slate-600">{description}</p>}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SwipeableCard;
