import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  isVisible,
  onClose
}) => {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      const timer = setTimeout(() => {
        setIsShowing(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, duration);
      
      return () => clearTimeout(timer);
    } else {
      setIsShowing(false);
    }
  }, [isVisible, duration, onClose]);

  const types = {
    success: {
      container: 'border-green-500 bg-green-50',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      text: 'text-green-800'
    },
    error: {
      container: 'border-red-500 bg-red-50',
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      text: 'text-red-800'
    },
    info: {
      container: 'border-blue-500 bg-blue-50',
      icon: <Info className="w-5 h-5 text-blue-500" />,
      text: 'text-blue-800'
    },
    warning: {
      container: 'border-yellow-500 bg-yellow-50',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      text: 'text-yellow-800'
    }
  };

  const config = types[type];

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 bg-white rounded-2xl shadow-2xl
                     p-4 border-l-4 z-50 transition-all duration-300
                     ${config.container} ${isShowing ? 'translate-x-0' : 'translate-x-full'}
                     max-w-sm w-full mx-4 animate-slide-up`}>
      <div className="flex items-center">
        {config.icon}
        <span className={`ml-3 flex-1 ${config.text}`}>{message}</span>
        <button 
          onClick={() => {
            setIsShowing(false);
            setTimeout(onClose, 300);
          }} 
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Toast Container to manage multiple toasts
interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type?: ToastType;
    duration?: number;
  }>;
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          isVisible={true}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  );
};

// Hook to manage toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type?: ToastType;
    duration?: number;
  }>>([]);

  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return { toasts, showToast, hideToast };
};

export default Toast;