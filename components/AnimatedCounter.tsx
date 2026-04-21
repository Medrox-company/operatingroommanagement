import React, { memo } from 'react';

interface AnimatedCounterProps {
  from?: number;
  to: number | string;
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = memo(({ to, className = '' }) => {
  return (
    <p className={`text-3xl font-black text-white leading-none tracking-tighter ${className}`}>
      {to}
    </p>
  );
});

AnimatedCounter.displayName = 'AnimatedCounter';

export default AnimatedCounter;
