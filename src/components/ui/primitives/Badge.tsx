'use client'

import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'new'
  size?: 'sm' | 'md'
  pulse?: boolean
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', pulse = false, ...props }, ref) => {
    const variants = {
      default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      success: 'bg-green-500/20 text-green-400 border-green-500/30',
      warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      danger: 'bg-red-500/20 text-red-400 border-red-500/30',
      info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      new: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    }
    
    const sizes = {
      sm: 'px-1.5 py-0.5 text-[10px]',
      md: 'px-2 py-0.5 text-xs',
    }
    
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-bold rounded-md border',
          variants[variant],
          sizes[size],
          pulse && 'animate-pulse',
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'
