import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedCounterProps {
  from?: number;
  to: number | string;
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ from = 0, to, className = '' }) => {
  const numericTo = typeof to === 'string' ? parseInt(to, 10) : to;
  const count = useMotionValue(from);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (isNaN(numericTo)) return;
    const controls = animate(count, numericTo, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [numericTo, count]);

  if (isNaN(numericTo)) {
    return (
      <p className={`text-3xl font-black text-white leading-none tracking-tighter ${className}`}>
        {to}
      </p>
    );
  }

  return (
    <motion.p className={`text-3xl font-black text-white leading-none tracking-tighter ${className}`}>
      {rounded}
    </motion.p>
  );
};

export default AnimatedCounter;
