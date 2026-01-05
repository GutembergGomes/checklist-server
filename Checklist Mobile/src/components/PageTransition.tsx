import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
  duration?: number;
  type?: 'slide' | 'fade' | 'scale';
}

const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  duration = 300,
  type = 'slide'
}) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    // Start exit animation
    setIsVisible(false);
    
    // Wait for exit animation to complete
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsVisible(true);
    }, duration / 2);

    return () => clearTimeout(timer);
  }, [location.pathname, children, duration]);

  useEffect(() => {
    // Initial mount
    setIsVisible(true);
  }, []);

  const getTransitionClass = () => {
    switch (type) {
      case 'fade':
        return isVisible ? 'opacity-100' : 'opacity-0';
      case 'scale':
        return isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95';
      case 'slide':
      default:
        return isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0';
    }
  };

  return (
    <div 
      className={`transition-all duration-${duration} ease-out ${getTransitionClass()}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;