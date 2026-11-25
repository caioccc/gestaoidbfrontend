import { useInViewport, useReducedMotion } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const { ref, inViewport } = useInViewport<HTMLDivElement>();
  const [hasEntered, setHasEntered] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (inViewport) {
      setHasEntered(true);
    }
  }, [inViewport]);

  const style: CSSProperties = {
    ['--landing-reveal-delay' as string]: `${delay}ms`,
  };

  return (
    <div
      ref={ref}
      className={`landing-reveal ${hasEntered || reduceMotion ? 'landing-reveal--visible' : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
