import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-medium shadow',
    secondary: 'px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-slate-900 font-medium border border-gray-200',
    ghost: 'px-4 py-2 rounded-2xl bg-transparent hover:bg-gray-100 text-slate-900 font-medium',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

