import React, { memo } from 'react';

interface AnimatedCounterProps {
  from?: number;
  to: number | string;
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = memo(({ to, className = '' }) => {
  return (
    <p className={`text-3xl font-bold text-white leading-none tracking-tight ${className}`}>
      {to}
    </p>
  );
});

AnimatedCounter.displayName = 'AnimatedCounter';

export default AnimatedCounter;
