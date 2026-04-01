import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-pill border border-[rgba(52,211,153,0.12)] bg-[#131D17] px-4 py-2 text-sm text-[#ECFDF5] placeholder:text-[#2D4A3A] transition-all outline-none focus:border-[rgba(52,211,153,0.4)] focus:ring-2 focus:ring-[rgba(52,211,153,0.08)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
