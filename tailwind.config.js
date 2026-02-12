/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Bloomberg Terminal Color System
        bloomberg: {
          orange: {
            DEFAULT: '#F7931A', // Bitcoin orange - primary brand color
            50: '#FFF7ED',
            100: '#FFEDD5',
            200: '#FED7AA',
            300: '#FDBA74',
            400: '#FB923C',
            500: '#F7931A', // Main Bloomberg orange
            600: '#EA580C',
            700: '#C2410C',
            800: '#9A3412',
            900: '#7C2D12',
            950: '#431407',
          },
          black: {
            DEFAULT: '#000000', // Pure black background
            900: '#0A0A0A',
            800: '#1A1A1A',
            700: '#2A2A2A',
            600: '#3A3A3A',
            500: '#4A4A4A',
          },
          gray: {
            DEFAULT: '#374151',
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
            950: '#030712',
          },
          green: {
            DEFAULT: '#10B981',
            400: '#34D399',
            500: '#10B981',
            600: '#059669',
          },
          red: {
            DEFAULT: '#EF4444',
            400: '#F87171',
            500: '#EF4444',
            600: '#DC2626',
          },
          blue: {
            DEFAULT: '#3B82F6',
            400: '#60A5FA',
            500: '#3B82F6',
            600: '#2563EB',
          },
          purple: {
            DEFAULT: '#8B5CF6',
            400: '#A78BFA',
            500: '#8B5CF6',
            600: '#7C3AED',
          },
          yellow: {
            DEFAULT: '#F59E0B',
            400: '#FBBF24',
            500: '#F59E0B',
            600: '#D97706',
          },
        },
        // CYPHER Design System
        cypher: {
          accent: '#F7931A',
          'accent-dim': '#F7931A80',
          'accent-bright': '#FFB347',
          surface: {
            0: '#000000',
            1: '#0a0a0a',
            2: '#111111',
            3: '#1a1a1a',
            4: '#222222',
          },
          border: '#1e1e1e',
          'border-active': '#F7931A40',
        },
        // Legacy color system for backward compatibility
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: '#F7931A', // Bloomberg orange
          foreground: '#000000',
        },
        secondary: {
          DEFAULT: '#3B82F6',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#6b7280',
          foreground: '#9ca3af',
        },
        accent: {
          DEFAULT: '#10B981',
          foreground: '#ffffff',
        },
        card: {
          DEFAULT: '#000000',
          foreground: '#F7931A',
        },
        border: '#F7931A',
        purple: {
          DEFAULT: '#8B5CF6',
          light: '#A78BFA',
          dark: '#7C4DFF',
        },
        blue: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
        },
        green: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', 'monospace'],
        terminal: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
      },
      fontSize: {
        'terminal-xs': ['10px', { lineHeight: '12px', letterSpacing: '0.025em' }],
        'terminal-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.025em' }],
        'terminal-base': ['12px', { lineHeight: '16px', letterSpacing: '0.025em' }],
        'terminal-lg': ['14px', { lineHeight: '18px', letterSpacing: '0.025em' }],
        'terminal-xl': ['16px', { lineHeight: '22px', letterSpacing: '0.025em' }],
      },
      spacing: {
        'terminal-xs': '2px',
        'terminal-sm': '4px',
        'terminal-md': '8px',
        'terminal-lg': '12px',
        'terminal-xl': '16px',
        'terminal-2xl': '24px',
        'terminal-3xl': '32px',
        'terminal-4xl': '48px',
      },
      borderRadius: {
        'terminal': '4px',
        'terminal-sm': '2px',
        'terminal-lg': '8px',
        'terminal-xl': '12px',
      },
      transitionTimingFunction: {
        'terminal': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'terminal': '200ms',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-in-out',
        'slide-in': 'slide-in 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'scaleIn': 'scaleIn 0.3s ease-in-out',
        'terminal-blink': 'terminal-blink 1s infinite',
        'data-scroll': 'data-scroll 20s linear infinite',
        'price-flash': 'price-flash 0.5s ease-in-out',
        'number-update': 'number-update 0.3s ease-in-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scaleIn': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'terminal-blink': {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        'data-scroll': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'price-flash': {
          '0%': { backgroundColor: 'rgba(247, 147, 26, 0.3)' },
          '50%': { backgroundColor: 'rgba(247, 147, 26, 0.6)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'number-update': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)', color: '#F7931A' },
          '100%': { transform: 'scale(1)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      backdropBlur: {
        'terminal': '8px',
      },
      boxShadow: {
        'terminal': '0 0 0 1px rgba(247, 147, 26, 0.1), 0 4px 16px rgba(0, 0, 0, 0.8)',
        'terminal-inner': 'inset 0 0 0 1px rgba(247, 147, 26, 0.2)',
        'terminal-glow': '0 0 20px rgba(247, 147, 26, 0.3)',
        'glow-sm': '0 0 4px rgba(247, 147, 26, 0.3)',
        'glow-md': '0 0 8px rgba(247, 147, 26, 0.4)',
        'glow-lg': '0 0 16px rgba(247, 147, 26, 0.5)',
      },
    },
  },
  plugins: [
    // Custom Bloomberg Terminal plugin
    function({ addUtilities, theme }) {
      const newUtilities = {
        '.terminal-border': {
          border: '1px solid rgba(247, 147, 26, 0.3)',
          '&:hover': {
            borderColor: 'rgba(247, 147, 26, 0.5)',
          },
          '&:focus': {
            borderColor: '#F7931A',
            outline: 'none',
            boxShadow: '0 0 0 2px rgba(247, 147, 26, 0.2)',
          },
        },
        '.terminal-text': {
          fontFamily: theme('fontFamily.terminal'),
          fontSize: theme('fontSize.terminal-base')[0],
          lineHeight: theme('fontSize.terminal-base')[1].lineHeight,
          letterSpacing: theme('fontSize.terminal-base')[1].letterSpacing,
          color: '#F7931A',
        },
        '.terminal-background': {
          backgroundColor: '#000000',
          backgroundImage: 'radial-gradient(rgba(247, 147, 26, 0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        },
        '.terminal-grid': {
          backgroundImage: `
            linear-gradient(rgba(247, 147, 26, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(247, 147, 26, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        },
        '.terminal-scanlines': {
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundImage: 'linear-gradient(transparent 50%, rgba(247, 147, 26, 0.02) 50%)',
            backgroundSize: '100% 2px',
            pointerEvents: 'none',
          },
        },
        '.terminal-flicker': {
          animation: 'terminal-blink 0.15s infinite linear',
        },
      };
      addUtilities(newUtilities);
    },
    // Focus ring plugin for accessibility
    function({ addUtilities }) {
      addUtilities({
        '.focus-terminal': {
          '&:focus': {
            outline: '2px solid #F7931A',
            outlineOffset: '2px',
          },
          '&:focus:not(:focus-visible)': {
            outline: 'none',
          },
        },
      });
    },
  ],
};