import React from 'react';

interface ReferoLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  theme?: 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ReferoLogo: React.FC<ReferoLogoProps> = ({
  variant = 'full',
  theme = 'light',
  className = '',
  size = 'md',
}) => {
  // Sizing definitions
  const iconSize = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  }[size];

  const textSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size];

  const taglineSize = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  }[size];

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-[#142B4A]';
  const tagColor = isDark ? 'text-slate-300' : 'text-slate-500';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Custom Vector Icon: Bag + Modern Letter R + Coral Reward Accent */}
      <svg
        className={`${iconSize} shrink-0 transition-transform duration-200 hover:scale-105`}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="REFERO Logo Icon"
      >
        {/* Soft rounded container / bag body */}
        <rect
          x="4"
          y="6"
          width="40"
          height="38"
          rx="10"
          fill={isDark ? '#1E3A5F' : '#142B4A'}
        />

        {/* Minimalist Shopping Bag Handle */}
        <path
          d="M17 12V10C17 6.68629 19.6863 4 23 4H25C28.3137 4 31 6.68629 31 10V12"
          stroke="#EAF3FF"
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Dynamic Letter 'R' spine and loop with smooth geometry */}
        <path
          d="M18 19V33"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M18 20H25.5C28 20 29.5 21.5 29.5 23.8C29.5 26.2 27.8 27.5 25.5 27.5H18"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dynamic diagonal leg of R flowing forward */}
        <path
          d="M24 27.5L30 33"
          stroke="#F47B44"
          strokeWidth="3.4"
          strokeLinecap="round"
        />

        {/* Sparkling Reward / Loyalty Connection Motif in Coral Orange */}
        <circle cx="33" cy="18" r="3.5" fill="#F47B44" />
        <circle cx="33" cy="18" r="1.5" fill="#FFFFFF" />
      </svg>

      {/* Wordmark & Tagline */}
      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center">
            <span
              className={`font-extrabold tracking-tight font-sans ${textSize} ${textColor}`}
            >
              REFER
            </span>
            <span
              className={`font-extrabold tracking-tight font-sans ${textSize} text-[#F47B44]`}
            >
              O
            </span>
          </div>
          {variant === 'full' && (
            <span
              className={`font-medium tracking-wide mt-0.5 uppercase ${taglineSize} ${tagColor}`}
            >
              Shop Smart · Earn Rewards
            </span>
          )}
        </div>
      )}
    </div>
  );
};
