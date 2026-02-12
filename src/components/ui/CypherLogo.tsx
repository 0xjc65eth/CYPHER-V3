'use client'

interface CypherLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showWordmark?: boolean
  animated?: boolean
  className?: string
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
} as const

const fontSizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-2xl',
} as const

export function CypherLogo({
  size = 'md',
  showWordmark = false,
  animated = false,
  className = '',
}: CypherLogoProps) {
  const px = sizeMap[size]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={animated ? 'animate-cypher-pulse' : ''}
        aria-hidden="true"
      >
        {/* Outer hexagonal frame */}
        <path
          d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
          stroke="#F7931A"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
        />
        {/* Geometric C mark */}
        <path
          d="M38 20C35.6 18.4 33 18 32 18C24.3 18 18 24.3 18 32C18 39.7 24.3 46 32 46C33 46 35.6 45.6 38 44"
          stroke="#F7931A"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Inner accent dot */}
        <circle cx="42" cy="32" r="3" fill="#F7931A" opacity="0.6" />
      </svg>

      {showWordmark && (
        <span
          className={`font-mono font-bold tracking-widest text-[#F7931A] ${fontSizeMap[size]}`}
        >
          CYPHER
        </span>
      )}

      {animated && (
        <style jsx>{`
          @keyframes cypher-pulse {
            0%, 100% { filter: drop-shadow(0 0 2px rgba(247, 147, 26, 0.4)); }
            50% { filter: drop-shadow(0 0 8px rgba(247, 147, 26, 0.8)); }
          }
          .animate-cypher-pulse {
            animation: cypher-pulse 2s ease-in-out infinite;
          }
        `}</style>
      )}
    </div>
  )
}
