'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error = false, fullWidth = false, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'px-3 py-2 bg-[#0a0a0f] border rounded text-white text-sm placeholder:text-gray-600 font-mono',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black',
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
            : 'border-[#2a2a3e] focus:border-[#f59e0b] focus:ring-[#f59e0b]/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          fullWidth && 'w-full',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  fullWidth?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, Omit<TextareaProps, 'type'>>(
  ({ className, error = false, fullWidth = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'px-3 py-2 bg-[#0a0a0f] border rounded text-white text-sm placeholder:text-gray-600 font-mono resize-none',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black',
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
            : 'border-[#2a2a3e] focus:border-[#f59e0b] focus:ring-[#f59e0b]/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          fullWidth && 'w-full',
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
