import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-[#D4A843] to-[#A07830] border-transparent text-[#0D0B05]',
        secondary:
          'bg-[rgba(212,168,67,0.08)] border-[rgba(212,168,67,0.2)] text-[#D4A843]',
        gold:
          'bg-[rgba(212,168,67,0.1)] border-[rgba(212,168,67,0.25)] text-[#D4A843]',
        easy:
          'bg-[rgba(52,211,153,0.12)] border-[rgba(52,211,153,0.3)] text-[#34D399]',
        medium:
          'bg-[rgba(212,168,67,0.12)] border-[rgba(212,168,67,0.3)] text-[#D4A843]',
        hard:
          'bg-[rgba(248,113,113,0.12)] border-[rgba(248,113,113,0.3)] text-[#F87171]',
        outline:
          'bg-transparent border-[rgba(212,168,67,0.2)] text-[#C9A86A]',
        muted:
          'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.07)] text-[#C9A86A]',
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
