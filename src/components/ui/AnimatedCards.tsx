'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Interfaces
interface BaseCardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

interface AnimatedCardProps extends BaseCardProps {
  variant?: 'default' | 'hover' | 'glow' | 'float' | 'flip' | 'scale' | 'slide' | 'rotate';
  intensity?: 'subtle' | 'normal' | 'strong';
  duration?: 'fast' | 'normal' | 'slow';
  delay?: number;
  shadow?: boolean;
  border?: boolean;
}

interface HoverEffectCardProps extends BaseCardProps {
  hoverContent?: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
}

interface FlipCardProps extends BaseCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  flipTrigger?: 'hover' | 'click';
}

interface GlowCardProps extends BaseCardProps {
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
  animated?: boolean;
}

interface FloatingCardProps extends BaseCardProps {
  amplitude?: 'small' | 'medium' | 'large';
  speed?: 'slow' | 'normal' | 'fast';
}

interface StackedCardsProps {
  cards: Array<{
    id: string;
    content: React.ReactNode;
    color?: string;
  }>;
  className?: string;
  maxVisible?: number;
}

interface InteractiveCardProps extends BaseCardProps {
  title?: string;
  description?: string;
  image?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  }>;
}

// Utilities
const intensityClasses = {
  subtle: 'scale-105',
  normal: 'scale-110',
  strong: 'scale-125'
};

const durationClasses = {
  fast: 'duration-150',
  normal: 'duration-300',
  slow: 'duration-500'
};

const shadowClasses = {
  subtle: 'shadow-sm hover:shadow-md',
  normal: 'shadow-md hover:shadow-lg',
  strong: 'shadow-lg hover:shadow-xl'
};

// Base Card Component
export const BaseCard: React.FC<BaseCardProps> = ({
  className,
  children,
  onClick,
  disabled = false,
  style
}) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
        'transition-all duration-300 ease-in-out',
        onClick && !disabled && 'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={style}
      onClick={!disabled ? onClick : undefined}
    >
      {children}
    </div>
  );
};

// Animated Card with Multiple Variants
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  variant = 'default',
  intensity = 'normal',
  duration = 'normal',
  delay = 0,
  shadow = true,
  border = true,
  className,
  children,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getVariantClasses = () => {
    switch (variant) {
      case 'hover':
        return cn(
          'hover:' + intensityClasses[intensity],
          'hover:-translate-y-1',
          shadow && shadowClasses[intensity]
        );
      
      case 'glow':
        return cn(
          'hover:shadow-2xl hover:shadow-blue-500/25',
          'hover:border-blue-500/50',
          'hover:' + intensityClasses[intensity]
        );
      
      case 'float':
        return cn(
          'animate-bounce',
          'hover:animate-none hover:' + intensityClasses[intensity]
        );
      
      case 'flip':
        return cn(
          'hover:rotate-y-180',
          'transform-style-preserve-3d perspective-1000'
        );
      
      case 'scale':
        return cn(
          'hover:' + intensityClasses[intensity],
          shadow && shadowClasses[intensity]
        );
      
      case 'slide':
        return cn(
          'hover:translate-x-2',
          shadow && shadowClasses[intensity]
        );
      
      case 'rotate':
        return cn(
          'hover:rotate-3',
          'hover:' + intensityClasses.subtle,
          shadow && shadowClasses[intensity]
        );
      
      default:
        return '';
    }
  };

  return (
    <BaseCard
      className={cn(
        'transform transition-all',
        durationClasses[duration],
        getVariantClasses(),
        !border && 'border-none',
        !isLoaded && 'opacity-0 translate-y-4',
        isLoaded && 'opacity-100 translate-y-0',
        className
      )}
      {...props}
    >
      {children}
    </BaseCard>
  );
};

// Hover Effect Card
export const HoverEffectCard: React.FC<HoverEffectCardProps> = ({
  hoverContent,
  direction = 'up',
  className,
  children,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getDirectionClasses = () => {
    if (!isHovered) return 'opacity-0 pointer-events-none';
    
    switch (direction) {
      case 'up':
        return 'opacity-100 translate-y-0';
      case 'down':
        return 'opacity-100 translate-y-0';
      case 'left':
        return 'opacity-100 translate-x-0';
      case 'right':
        return 'opacity-100 translate-x-0';
      default:
        return 'opacity-100';
    }
  };

  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return 'translate-y-4';
      case 'down':
        return '-translate-y-4';
      case 'left':
        return 'translate-x-4';
      case 'right':
        return '-translate-x-4';
      default:
        return '';
    }
  };

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BaseCard
        className={cn(
          'transition-all duration-300',
          isHovered && 'scale-105 shadow-lg',
          className
        )}
        {...props}
      >
        {children}
      </BaseCard>
      
      {hoverContent && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/80 backdrop-blur-sm transition-all duration-300',
            getInitialPosition(),
            getDirectionClasses()
          )}
        >
          <div className="text-white p-4 text-center">
            {hoverContent}
          </div>
        </div>
      )}
    </div>
  );
};

// Flip Card
export const FlipCard: React.FC<FlipCardProps> = ({
  frontContent,
  backContent,
  flipTrigger = 'hover',
  className,
  ...props
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleInteraction = () => {
    if (flipTrigger === 'click') {
      setIsFlipped(!isFlipped);
    }
  };

  const triggerProps = flipTrigger === 'hover' 
    ? {
        onMouseEnter: () => setIsFlipped(true),
        onMouseLeave: () => setIsFlipped(false)
      }
    : {
        onClick: handleInteraction
      };

  return (
    <div
      className={cn(
        'relative w-full h-64 perspective-1000',
        flipTrigger === 'click' && 'cursor-pointer',
        className
      )}
      {...triggerProps}
    >
      {/* Front */}
      <div
        className={cn(
          'absolute inset-0 w-full h-full transition-transform duration-600',
          'transform-style-preserve-3d backface-hidden',
          isFlipped && 'rotate-y-180'
        )}
      >
        <BaseCard className="w-full h-full p-6" {...props}>
          {frontContent}
        </BaseCard>
      </div>
      
      {/* Back */}
      <div
        className={cn(
          'absolute inset-0 w-full h-full transition-transform duration-600',
          'transform-style-preserve-3d backface-hidden rotate-y-180',
          isFlipped && 'rotate-y-0'
        )}
      >
        <BaseCard className="w-full h-full p-6" {...props}>
          {backContent}
        </BaseCard>
      </div>
    </div>
  );
};

// Glow Card
export const GlowCard: React.FC<GlowCardProps> = ({
  glowColor = 'blue',
  intensity = 'medium',
  animated = true,
  className,
  children,
  ...props
}) => {
  const getGlowClasses = () => {
    const baseGlow = `shadow-${glowColor}-500/50`;
    
    switch (intensity) {
      case 'low':
        return `shadow-md ${baseGlow}`;
      case 'high':
        return `shadow-2xl ${baseGlow}`;
      default:
        return `shadow-lg ${baseGlow}`;
    }
  };

  return (
    <BaseCard
      className={cn(
        'relative overflow-hidden',
        getGlowClasses(),
        animated && 'animate-pulse',
        'hover:shadow-2xl hover:' + `shadow-${glowColor}-500/75`,
        'transition-all duration-500',
        className
      )}
      {...props}
    >
      {children}
      
      {/* Animated glow effect */}
      {animated && (
        <div
          className={cn(
            'absolute inset-0 opacity-20',
            `bg-gradient-to-r from-transparent via-${glowColor}-500 to-transparent`,
            'animate-shimmer'
          )}
          style={{
            transform: 'translateX(-100%)',
            animation: 'shimmer 2s infinite'
          }}
        />
      )}
    </BaseCard>
  );
};

// Floating Card
export const FloatingCard: React.FC<FloatingCardProps> = ({
  amplitude = 'medium',
  speed = 'normal',
  className,
  children,
  ...props
}) => {
  const getAnimationClasses = () => {
    const amplitudeClass = amplitude === 'small' ? 'translate-y-1' : 
                          amplitude === 'large' ? 'translate-y-3' : 'translate-y-2';
    
    const speedDuration = speed === 'slow' ? '4s' : 
                         speed === 'fast' ? '1.5s' : '2.5s';

    return {
      className: `animate-float-${amplitude}`,
      style: {
        animation: `float-${amplitude} ${speedDuration} ease-in-out infinite`
      }
    };
  };

  const animationProps = getAnimationClasses();

  return (
    <BaseCard
      className={cn(
        'transform transition-all duration-300',
        'hover:scale-105 hover:shadow-lg',
        animationProps.className,
        className
      )}
      style={animationProps.style}
      {...props}
    >
      {children}
    </BaseCard>
  );
};

// Stacked Cards
export const StackedCards: React.FC<StackedCardsProps> = ({
  cards,
  className,
  maxVisible = 3
}) => {
  const visibleCards = cards.slice(0, maxVisible);

  return (
    <div className={cn('relative', className)}>
      {visibleCards.map((card, index) => (
        <div
          key={card.id}
          className={cn(
            'absolute transition-all duration-300 ease-out',
            'hover:z-10 hover:scale-105 hover:rotate-0'
          )}
          style={{
            top: `${index * 8}px`,
            left: `${index * 8}px`,
            zIndex: visibleCards.length - index,
            transform: `rotate(${index * 2}deg)`,
            transformOrigin: 'bottom left'
          }}
        >
          <BaseCard className="w-64 h-40 p-4">
            {card.content}
          </BaseCard>
        </div>
      ))}
    </div>
  );
};

// Interactive Card with Actions
export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  title,
  description,
  image,
  actions = [],
  className,
  children,
  ...props
}) => {
  return (
    <AnimatedCard
      variant="hover"
      intensity="normal"
      className={cn('overflow-hidden', className)}
      {...props}
    >
      {image && (
        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 bg-cover bg-center"
             style={{ backgroundImage: `url(${image})` }} />
      )}
      
      <div className="p-6">
        {title && (
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
        )}
        
        {description && (
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {description}
          </p>
        )}
        
        {children}
        
        {actions.length > 0 && (
          <div className="flex gap-2 mt-4">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={cn(
                  'px-4 py-2 rounded-md font-medium transition-colors',
                  action.variant === 'primary' && 'bg-blue-500 text-white hover:bg-blue-600',
                  action.variant === 'secondary' && 'bg-gray-500 text-white hover:bg-gray-600',
                  action.variant === 'outline' && 'border border-gray-300 text-gray-700 hover:bg-gray-50',
                  !action.variant && 'bg-blue-500 text-white hover:bg-blue-600'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </AnimatedCard>
  );
};

// CSS-in-JS styles for custom animations
const customStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  @keyframes float-small {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  
  @keyframes float-medium {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-16px); }
  }
  
  @keyframes float-large {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-24px); }
  }
  
  .perspective-1000 { perspective: 1000px; }
  .transform-style-preserve-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
  .rotate-y-0 { transform: rotateY(0deg); }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

// Export all components
export {
  type AnimatedCardProps,
  type HoverEffectCardProps,
  type FlipCardProps,
  type GlowCardProps,
  type FloatingCardProps,
  type StackedCardsProps,
  type InteractiveCardProps
};

export default AnimatedCard;