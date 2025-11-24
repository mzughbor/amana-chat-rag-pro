import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={clsx(
        'p-4 rounded-2xl bg-white/90 shadow-lg border border-gray-100 transition-shadow duration-300',
        hover && 'hover:shadow-xl',
        className
      )}
    >
      {children}
    </div>
  );
}

