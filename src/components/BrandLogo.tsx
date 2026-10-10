import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitleText?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  subtitleText = 'PO · In-Transit · RTO · GRN · DN Ops',
}) => {
  const dimensions =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const titleSize =
    size === 'sm'
      ? 'text-sm sm:text-base'
      : size === 'lg'
      ? 'text-lg sm:text-xl'
      : 'text-sm sm:text-base lg:text-lg';

  return (
    <div className="inline-flex items-center gap-2.5 select-none shrink-0">
      <div
        className={`${dimensions} rounded-xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-0.5 shadow-sm shrink-0 flex items-center justify-center`}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Isometric Parcel Cube */}
          <path
            d="M32 10L52 21L32 32L12 21L32 10Z"
            fill="#FFFFFF"
          />
          <path
            d="M12 21L32 32V54L12 43V21Z"
            fill="#FFEDD5"
          />
          <path
            d="M52 21L32 32V54L52 43V21Z"
            fill="#FED7AA"
          />
          {/* Fast Dispatch Bolt */}
          <path
            d="M35 15L25 27H33L29 38L41 25H33L35 15Z"
            fill="#EA580C"
          />
          <circle
            cx="49"
            cy="15"
            r="5"
            fill="#10B981"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className={`${titleSize} font-bold tracking-tight whitespace-nowrap`}>
          Instamart <span className="text-orange-600 dark:text-orange-400">OpsHub</span>
        </span>
        {showSubtitle && (
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
};
