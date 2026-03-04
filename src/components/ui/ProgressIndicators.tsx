'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Interfaces
interface BaseProgressProps {
  value: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  animated?: boolean;
  showValue?: boolean;
  label?: string;
}

interface CircularProgressProps extends BaseProgressProps {
  strokeWidth?: number;
  backgroundColor?: string;
  gradient?: boolean;
  glow?: boolean;
}

interface LinearProgressProps extends BaseProgressProps {
  variant?: 'default' | 'striped' | 'gradient' | 'pulse';
  thickness?: 'thin' | 'normal' | 'thick';
  rounded?: boolean;
}

interface StepProgressProps {
  steps: Array<{
    id: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
  }>;
  currentStep: number;
  completedSteps?: number[];
  variant?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface MultiProgressProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
    max?: number;
  }>;
  stacked?: boolean;
  showLabels?: boolean;
  className?: string;
}

interface SkillBarProps extends BaseProgressProps {
  skill: string;
  duration?: number;
  delay?: number;
}

interface CounterProps {
  from: number;
  to: number;
  duration?: number;
  delay?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  animate?: boolean;
}

// Utilities
const sizeClasses = {
  sm: { width: 'w-16 h-16', text: 'text-xs', stroke: 2 },
  md: { width: 'w-24 h-24', text: 'text-sm', stroke: 3 },
  lg: { width: 'w-32 h-32', text: 'text-base', stroke: 4 },
  xl: { width: 'w-40 h-40', text: 'text-lg', stroke: 5 }
};

const colorClasses = {
  primary: { bg: 'bg-blue-500', stroke: 'stroke-blue-500', text: 'text-blue-500' },
  secondary: { bg: 'bg-gray-500', stroke: 'stroke-gray-500', text: 'text-gray-500' },
  success: { bg: 'bg-green-500', stroke: 'stroke-green-500', text: 'text-green-500' },
  warning: { bg: 'bg-yellow-500', stroke: 'stroke-yellow-500', text: 'text-yellow-500' },
  error: { bg: 'bg-red-500', stroke: 'stroke-red-500', text: 'text-red-500' },
  info: { bg: 'bg-cyan-500', stroke: 'stroke-cyan-500', text: 'text-cyan-500' }
};

const thicknessClasses = {
  thin: 'h-1',
  normal: 'h-2',
  thick: 'h-4'
};

// Circular Progress
export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  strokeWidth,
  backgroundColor = '#e5e7eb',
  gradient = false,
  glow = false,
  animated = true,
  showValue = true,
  label,
  className
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = Math.min((value / max) * 100, 100);
  
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  
  const actualStrokeWidth = strokeWidth || sizeClasses[size].stroke;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedValue(percentage);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedValue(percentage);
    }
  }, [percentage, animated]);

  const gradientId = `gradient-circular-progress`;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        className={cn(sizeClasses[size].width, 'transform -rotate-90')}
        viewBox="0 0 100 100"
      >
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorClasses[color].stroke.replace('stroke-', '')} />
              <stop offset="100%" stopColor={colorClasses[color].stroke.replace('stroke-', '')} stopOpacity="0.6" />
            </linearGradient>
          </defs>
        )}
        
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={backgroundColor}
          strokeWidth={actualStrokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={gradient ? `url(#${gradientId})` : colorClasses[color].stroke.replace('stroke-', '')}
          strokeWidth={actualStrokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-all duration-1000 ease-out',
            glow && `drop-shadow-[0_0_6px_${colorClasses[color].stroke.replace('stroke-', '')}]`
          )}
        />
      </svg>
      
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', sizeClasses[size].text, colorClasses[color].text)}>
            {Math.round(animatedValue)}%
          </span>
          {label && (
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Linear Progress
export const LinearProgress: React.FC<LinearProgressProps> = ({
  value,
  max = 100,
  variant = 'default',
  thickness = 'normal',
  color = 'primary',
  rounded = true,
  animated = true,
  showValue = false,
  label,
  className
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = Math.min((value / max) * 100, 100);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedValue(percentage);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedValue(percentage);
    }
  }, [percentage, animated]);

  const getVariantClasses = () => {
    switch (variant) {
      case 'striped':
        return 'bg-stripes animate-stripes';
      case 'gradient':
        return 'bg-gradient-to-r';
      case 'pulse':
        return 'animate-pulse';
      default:
        return '';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {showValue && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(animatedValue)}%
            </span>
          )}
        </div>
      )}
      
      <div
        className={cn(
          'w-full bg-gray-200 dark:bg-gray-700',
          thicknessClasses[thickness],
          rounded && 'rounded-full'
        )}
      >
        <div
          className={cn(
            colorClasses[color].bg,
            thicknessClasses[thickness],
            rounded && 'rounded-full',
            'transition-all duration-1000 ease-out',
            getVariantClasses()
          )}
          style={{ width: `${animatedValue}%` }}
        />
      </div>
    </div>
  );
};

// Step Progress
export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  currentStep,
  completedSteps = [],
  variant = 'horizontal',
  size = 'md',
  className
}) => {
  const isStepCompleted = (stepIndex: number) => {
    return completedSteps.includes(stepIndex) || stepIndex < currentStep;
  };

  const isStepCurrent = (stepIndex: number) => {
    return stepIndex === currentStep;
  };

  const stepSizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  if (variant === 'vertical') {
    return (
      <div className={cn('flex flex-col space-y-4', className)}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  stepSizeClasses[size],
                  isStepCompleted(index)
                    ? 'bg-green-500 border-green-500 text-white'
                    : isStepCurrent(index)
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                )}
              >
                {step.icon || (index + 1)}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-8 mt-2 transition-colors duration-300',
                    isStepCompleted(index) ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4
                className={cn(
                  'font-medium transition-colors duration-300',
                  isStepCurrent(index)
                    ? 'text-blue-600 dark:text-blue-400'
                    : isStepCompleted(index)
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {step.label}
              </h4>
              {step.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'rounded-full flex items-center justify-center border-2 transition-all duration-300',
                stepSizeClasses[size],
                isStepCompleted(index)
                  ? 'bg-green-500 border-green-500 text-white'
                  : isStepCurrent(index)
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              )}
            >
              {step.icon || (index + 1)}
            </div>
            <span
              className={cn(
                'text-xs mt-2 transition-colors duration-300',
                isStepCurrent(index)
                  ? 'text-blue-600 dark:text-blue-400'
                  : isStepCompleted(index)
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {step.label}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 transition-colors duration-300',
                isStepCompleted(index) ? 'bg-green-500' : 'bg-gray-300'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Multi Progress (for showing multiple values)
export const MultiProgress: React.FC<MultiProgressProps> = ({
  data,
  stacked = false,
  showLabels = true,
  className
}) => {
  if (stacked) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <div className={cn('w-full', className)}>
        {showLabels && (
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-wrap gap-2">
              {data.map((item, index) => (
                <div key={index} className="flex items-center space-x-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full flex">
            {data.map((item, index) => (
              <div
                key={index}
                className="h-full transition-all duration-1000 ease-out"
                style={{
                  width: `${(item.value / total) * 100}%`,
                  backgroundColor: item.color
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item, index) => (
        <div key={index}>
          <LinearProgress
            value={item.value}
            max={item.max}
            label={showLabels ? item.label : undefined}
            color="primary"
            showValue={showLabels}
            className="mb-2"
          />
        </div>
      ))}
    </div>
  );
};

// Skill Bar
export const SkillBar: React.FC<SkillBarProps> = ({
  skill,
  value,
  max = 100,
  color = 'primary',
  duration = 2000,
  delay = 0,
  className
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = Math.min((value / max) * 100, 100);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(percentage);
    }, delay);
    return () => clearTimeout(timer);
  }, [percentage, delay]);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {skill}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {Math.round(animatedValue)}%
        </span>
      </div>
      
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all ease-out',
            colorClasses[color].bg
          )}
          style={{
            width: `${animatedValue}%`,
            transitionDuration: `${duration}ms`
          }}
        />
      </div>
    </div>
  );
};

// Animated Counter
export const AnimatedCounter: React.FC<CounterProps> = ({
  from,
  to,
  duration = 2000,
  delay = 0,
  suffix = '',
  prefix = '',
  className,
  animate = true
}) => {
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (!animate) {
      setCount(to);
      return;
    }

    const timer = setTimeout(() => {
      const startTime = Date.now();
      const difference = to - from;

      const updateCounter = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const current = from + (difference * easeOutCubic);
        
        setCount(Math.round(current));
        
        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        }
      };

      requestAnimationFrame(updateCounter);
    }, delay);

    return () => clearTimeout(timer);
  }, [from, to, duration, delay, animate]);

  return (
    <span className={cn('font-bold', className)}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

// Wave Progress
export const WaveProgress: React.FC<BaseProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  className
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const waveHeight = (100 - percentage);

  return (
    <div className={cn('relative overflow-hidden rounded-lg', sizeClasses[size].width, className)}>
      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
      
      <div
        className={cn('absolute inset-x-0 bottom-0 transition-all duration-1000', colorClasses[color].bg)}
        style={{
          height: `${percentage}%`,
          clipPath: `polygon(0 ${waveHeight}%, 15% ${waveHeight - 10}%, 30% ${waveHeight}%, 45% ${waveHeight - 8}%, 60% ${waveHeight}%, 75% ${waveHeight - 12}%, 90% ${waveHeight}%, 100% ${waveHeight - 5}%, 100% 100%, 0 100%)`
        }}
      />
      
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn('font-bold', sizeClasses[size].text, 'text-white mix-blend-difference')}>
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};

// Export all components
export {
  type BaseProgressProps,
  type CircularProgressProps,
  type LinearProgressProps,
  type StepProgressProps,
  type MultiProgressProps,
  type SkillBarProps,
  type CounterProps
};

export default {
  CircularProgress,
  LinearProgress,
  StepProgress,
  MultiProgress,
  SkillBar,
  AnimatedCounter,
  WaveProgress
};