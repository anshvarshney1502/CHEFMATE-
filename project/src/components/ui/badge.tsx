import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-[#34D399] to-[#059669] border-transparent text-[#060A07]',
        secondary:
          'bg-[rgba(52,211,153,0.08)] border-[rgba(52,211,153,0.2)] text-[#34D399]',
        gold:
          'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.25)] text-[#F59E0B]',
        easy:
          'bg-[rgba(52,211,153,0.12)] border-[rgba(52,211,153,0.3)] text-[#34D399]',
        medium:
          'bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.3)] text-[#F59E0B]',
        hard:
          'bg-[rgba(248,113,113,0.12)] border-[rgba(248,113,113,0.3)] text-[#F87171]',
        outline:
          'bg-transparent border-[rgba(52,211,153,0.2)] text-[#6EE7B7]',
        muted:
          'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.07)] text-[#6EE7B7]',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
