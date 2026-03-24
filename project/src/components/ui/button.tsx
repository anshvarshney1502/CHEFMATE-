import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-pill text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34D399]/50 disabled:pointer-events-none disabled:opacity-40 active:scale-95',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-[#34D399] to-[#059669] text-[#060A07] font-semibold shadow-[0_4px_14px_rgba(52,211,153,0.35)] hover:shadow-[0_6px_20px_rgba(52,211,153,0.5)] hover:-translate-y-px',
        secondary:
          'bg-[#131D17] border border-[rgba(52,211,153,0.12)] text-[#6EE7B7] hover:bg-[#192A1F] hover:border-[rgba(52,211,153,0.3)] hover:-translate-y-px',
        ghost:
          'bg-transparent text-[#6EE7B7] hover:bg-[#131D17] hover:text-[#ECFDF5] hover:-translate-y-px',
        destructive:
          'bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.25)] text-[#F87171] hover:bg-[rgba(248,113,113,0.2)]',
        gold:
          'bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-[#060A07] font-semibold shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.5)] hover:-translate-y-px',
        outline:
          'border border-[rgba(52,211,153,0.2)] bg-transparent text-[#ECFDF5] hover:bg-[#131D17] hover:border-[rgba(52,211,153,0.4)] hover:-translate-y-px',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
