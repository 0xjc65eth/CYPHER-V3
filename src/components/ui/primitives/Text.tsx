'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Text variants configuration
const textVariants = cva(
  'transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'text-[var(--text-primary)]',
        secondary: 'text-[var(--text-secondary)]',
        tertiary: 'text-[var(--text-tertiary)]',
        quaternary: 'text-[var(--text-quaternary)]',
        disabled: 'text-[var(--text-disabled)]',
        primary: 'text-primary-500',
        success: 'text-success-500',
        warning: 'text-warning-500',
        danger: 'text-danger-500',
        gradient: 'gradient-text',
      },
      size: {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
        '5xl': 'text-5xl',
        '6xl': 'text-6xl',
        '7xl': 'text-7xl',
        '8xl': 'text-8xl',
        '9xl': 'text-9xl',
      },
      weight: {
        thin: 'font-thin',
        extralight: 'font-extralight',
        light: 'font-light',
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
        extrabold: 'font-extrabold',
        black: 'font-black',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify',
      },
      font: {
        sans: 'font-sans',
        mono: 'font-mono',
      },
      truncate: {
        true: 'truncate',
      },
      balance: {
        true: 'text-balance',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'base',
      weight: 'normal',
      align: 'left',
      font: 'sans',
      truncate: false,
      balance: false,
    },
  }
);

// Base text component props
export interface TextProps
  extends VariantProps<typeof textVariants> {
  children: React.ReactNode;
  className?: string;
}

// Type for component prop
type Component = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label';

// Extended props with HTML attributes
export interface TextComponentProps<T extends Component>
  extends TextProps,
    Omit<React.HTMLAttributes<HTMLElement>, 'children' | 'className'> {
  as?: T;
}

// Main Text component
export const Text = React.forwardRef<HTMLElement, TextComponentProps<Component>>(({
  as,
  variant,
  size,
  weight,
  align,
  font,
  truncate,
  balance,
  className,
  children,
  ...props
}, ref) => {
  const Component = as || 'p';

  return (
    <Component
      ref={ref as any}
      className={cn(
        textVariants({ variant, size, weight, align, font, truncate, balance }),
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}) as any;

Text.displayName = 'Text';

// Heading component
export const Heading = React.forwardRef<
  HTMLHeadingElement,
  TextComponentProps<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'> & {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
  }
>(({ level = 1, as, size, weight = 'bold', ...props }, ref) => {
  const Component = as || (`h${level}` as const);
  
  // Default sizes for each heading level
  const defaultSizes = {
    h1: '5xl',
    h2: '4xl',
    h3: '3xl',
    h4: '2xl',
    h5: 'xl',
    h6: 'lg',
  } as const;
  
  const defaultSize = size || defaultSizes[Component];
  
  return (
    <Text
      ref={ref}
      as={Component}
      size={defaultSize}
      weight={weight}
      {...props}
    />
  );
});

Heading.displayName = 'Heading';

// Display component for large headings
export const Display = React.forwardRef<
  HTMLHeadingElement,
  Omit<TextComponentProps<'h1'>, 'size'> & {
    size?: '6xl' | '7xl' | '8xl' | '9xl';
  }
>(({ size = '7xl', weight = 'black', ...props }, ref) => {
  return (
    <Text
      ref={ref}
      as="h1"
      size={size}
      weight={weight}
      {...props}
    />
  );
});

Display.displayName = 'Display';

// Label component
export const Label = React.forwardRef<
  HTMLLabelElement,
  TextComponentProps<'label'> & {
    htmlFor?: string;
    required?: boolean;
  }
>(({ size = 'sm', weight = 'medium', required, children, ...props }, ref) => {
  return (
    <Text
      ref={ref}
      as="label"
      size={size}
      weight={weight}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-danger-500" aria-label="required">
          *
        </span>
      )}
    </Text>
  );
});

Label.displayName = 'Label';

// Caption component
export const Caption = React.forwardRef<
  HTMLParagraphElement,
  Omit<TextComponentProps<'p'>, 'size' | 'variant'>
>(({ ...props }, ref) => {
  return (
    <Text
      ref={ref}
      as="p"
      size="sm"
      variant="tertiary"
      {...props}
    />
  );
});

Caption.displayName = 'Caption';

// Code component
export const Code = React.forwardRef<
  HTMLElement,
  Omit<TextComponentProps<'span'>, 'font'> & {
    block?: boolean;
  }
>(({ block, className, ...props }, ref) => {
  const Component = block ? 'pre' : 'code';
  
  return (
    <Component
      ref={ref as any}
      className={cn(
        'font-mono text-sm',
        block
          ? 'block overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4'
          : 'inline-block rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5',
        className
      )}
      {...props}
    />
  );
});

Code.displayName = 'Code';

// Link component
export const Link = React.forwardRef<
  HTMLAnchorElement,
  Omit<TextComponentProps<'span'>, 'variant'> &
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      underline?: boolean;
    }
>(({ underline = true, className, children, ...props }, ref) => {
  return (
    <a
      ref={ref}
      className={cn(
        'text-primary-500 transition-colors hover:text-primary-600',
        underline && 'underline underline-offset-4',
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
});

Link.displayName = 'Link';

// Strong component
export const Strong = React.forwardRef<
  HTMLElement,
  Omit<TextComponentProps<'span'>, 'weight'>
>(({ ...props }, ref) => {
  return (
    <Text
      ref={ref}
      as="span"
      weight="semibold"
      {...props}
    />
  );
});

Strong.displayName = 'Strong';

// Emphasis component
export const Emphasis = React.forwardRef<
  HTMLElement,
  TextComponentProps<'span'>
>(({ className, ...props }, ref) => {
  return (
    <Text
      ref={ref}
      as="span"
      className={cn('italic', className)}
      {...props}
    />
  );
});

Emphasis.displayName = 'Emphasis';

// Keyboard component
export const Kbd = React.forwardRef<
  HTMLElement,
  Omit<TextComponentProps<'span'>, 'font' | 'size'>
>(({ className, children, ...props }, ref) => {
  return (
    <kbd
      ref={ref}
      className={cn(
        'inline-flex h-5 items-center rounded border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-1.5 font-mono text-xs font-medium text-[var(--text-secondary)]',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
});

Kbd.displayName = 'Kbd';

export { textVariants };