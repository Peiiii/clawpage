interface LogoProps {
  className?: string
  size?: number
}

export function Logo({ className = '', size = 36 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="clawGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f3e8ff" />
        </linearGradient>
      </defs>

      {/* Rounded background */}
      <rect width="36" height="36" rx="10" fill="url(#logoGradient)" />

      {/* Claw/lobster claw shape */}
      <path
        d="M10 14c0-2 1.5-4 4-4s4 2 4 4v4c0 1.5-1 2.5-2 3v3c0 1-1 2-2 2s-2-1-2-2v-3c-1-.5-2-1.5-2-3v-4z"
        fill="url(#clawGradient)"
      />
      <path
        d="M22 14c0-2-1.5-4-4-4s-4 2-4 4v4c0 1.5 1 2.5 2 3v3c0 1 1 2 2 2s2-1 2-2v-3c1-.5 2-1.5 2-3v-4z"
        fill="url(#clawGradient)"
      />

      {/* Claw pincers */}
      <path
        d="M8 12c-1-1-1-2.5 0-3.5s2.5-1 3.5 0l1 1"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M28 12c1-1 1-2.5 0-3.5s-2.5-1-3.5 0l-1 1"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Center body */}
      <ellipse cx="18" cy="22" rx="3" ry="4" fill="url(#clawGradient)" />

      {/* Eyes */}
      <circle cx="15" cy="16" r="1.5" fill="#a855f7" />
      <circle cx="21" cy="16" r="1.5" fill="#a855f7" />
    </svg>
  )
}

export function LogoSimple({ className = '', size = 24 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoSimpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      {/* Claw shape simplified */}
      <path
        d="M6 10c0-1.5 1-3 3-3s3 1.5 3 3v2c0 1-.5 1.5-1 2v2c0 .5-.5 1-1 1s-1-.5-1-1v-2c-.5-.5-1-1-1-2v-2z"
        fill="url(#logoSimpleGradient)"
      />
      <path
        d="M18 10c0-1.5-1-3-3-3s-3 1.5-3 3v2c0 1 .5 1.5 1 2v2c0 .5.5 1 1 1s1-.5 1-1v-2c.5-.5 1-1 1-2v-2z"
        fill="url(#logoSimpleGradient)"
      />

      {/* Center */}
      <circle cx="12" cy="15" r="2" fill="url(#logoSimpleGradient)" />
    </svg>
  )
}
