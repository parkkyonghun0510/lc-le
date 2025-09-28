/**
 * Accessible Tooltip Component
 * Provides contextual help and information with proper ARIA support.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'default' | 'info' | 'warning' | 'success';
  delay?: number;
  disabled?: boolean;
  className?: string;
  maxWidth?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  variant = 'default',
  delay = 300,
  disabled = false,
  className = '',
  maxWidth = 200
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getVariantStyles = () => {
    const baseStyles = 'px-3 py-2 text-sm rounded-lg shadow-lg border z-50';
    
    switch (variant) {
      case 'info':
        return `${baseStyles} bg-blue-50 text-blue-900 border-blue-200`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 text-yellow-900 border-yellow-200`;
      case 'success':
        return `${baseStyles} bg-green-50 text-green-900 border-green-200`;
      default:
        return `${baseStyles} bg-gray-900 text-white border-gray-700`;
    }
  };

  const getVariantIcon = () => {
    const iconClass = 'w-4 h-4 mr-2 flex-shrink-0';
    
    switch (variant) {
      case 'info':
        return <Info className={`${iconClass} text-blue-600`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-600`} />;
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      default:
        return <HelpCircle className={`${iconClass} text-gray-400`} />;
    }
  };

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollTop - tooltipRect.height - 8;
        left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollTop + 8;
        left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left + scrollLeft - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + scrollLeft + 8;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 8) left = 8;
    if (left + tooltipRect.width > viewportWidth - 8) {
      left = viewportWidth - tooltipRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + tooltipRect.height > viewportHeight - 8) {
      top = viewportHeight - tooltipRect.height - 8;
    }

    setTooltipPosition({ top, left });
  };

  const showTooltip = () => {
    if (disabled) return;
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, position]);

  useEffect(() => {
    const handleScroll = () => {
      if (isVisible) {
        calculatePosition();
      }
    };

    const handleResize = () => {
      if (isVisible) {
        calculatePosition();
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-describedby={isVisible ? tooltipId : undefined}
        role="button"
        tabIndex={0}
      >
        {children}
      </div>

      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          id={tooltipId}
          className={`fixed ${getVariantStyles()}`}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            maxWidth: maxWidth
          }}
          role="tooltip"
          aria-live="polite"
        >
          <div className="flex items-start">
            {getVariantIcon()}
            <div className="flex-1">
              {typeof content === 'string' ? (
                <p className="leading-relaxed">{content}</p>
              ) : (
                content
              )}
            </div>
          </div>
          
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 transform rotate-45 ${
              variant === 'default' ? 'bg-gray-900' : 
              variant === 'info' ? 'bg-blue-50 border-blue-200' :
              variant === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}
            style={{
              [position === 'top' ? 'bottom' : position === 'bottom' ? 'top' : 'top']: '-4px',
              [position === 'left' ? 'right' : position === 'right' ? 'left' : 'left']: '50%',
              transform: `translateX(${position === 'left' || position === 'right' ? '0' : '-50%'}) rotate(45deg)`
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;

// Convenience components for different tooltip types
export const InfoTooltip: React.FC<Omit<TooltipProps, 'variant'>> = (props) => (
  <Tooltip {...props} variant="info" />
);

export const WarningTooltip: React.FC<Omit<TooltipProps, 'variant'>> = (props) => (
  <Tooltip {...props} variant="warning" />
);

export const SuccessTooltip: React.FC<Omit<TooltipProps, 'variant'>> = (props) => (
  <Tooltip {...props} variant="success" />
);

// Hook for programmatic tooltip control
export const useTooltip = () => {
  const [isVisible, setIsVisible] = useState(false);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);
  const toggle = () => setIsVisible(prev => !prev);

  return { isVisible, show, hide, toggle };
};
