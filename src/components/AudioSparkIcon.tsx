import React from 'react';

interface AudioSparkIconProps {
  size?: number;
  color?: string;
  isAnimated?: boolean;
  className?: string;
}

export const AudioSparkIcon: React.FC<AudioSparkIconProps> = ({
  size = 20,
  color = '#38bdf8',
  isAnimated = false,
  className = '',
}) => {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        filter: isAnimated ? `drop-shadow(0 0 6px ${color}88)` : 'none',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Spark Star Geometry */}
        <path
          d="M12 2C12 2 12.8 6.5 14.5 8.5C16.5 10.2 21 11 21 11C21 11 16.5 11.8 14.5 13.5C12.8 15.5 12 20 12 20C12 20 11.2 15.5 9.5 13.5C7.5 11.8 3 11 3 11C3 11 7.5 10.2 9.5 8.5C11.2 6.5 12 2 12 2Z"
          fill={`${color}22`}
        />
        {/* Dynamic Audio Waves radiating through the spark */}
        <line x1="8" y1="11" x2="8" y2="13" strokeWidth="2.4" />
        <line x1="12" y1="8.5" x2="12" y2="15.5" strokeWidth="2.8" />
        <line x1="16" y1="11" x2="16" y2="13" strokeWidth="2.4" />
        {/* Spark accents */}
        <circle cx="19" cy="5" r="1.2" fill={color} stroke="none" />
        <circle cx="5" cy="18" r="1" fill={color} stroke="none" />
      </svg>
    </span>
  );
};
