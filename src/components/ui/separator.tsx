import * as React from 'react';
import { cn } from '../../lib/utils';

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      orientation === 'horizontal'
        ? 'h-px w-full bg-gradient-to-r from-transparent via-[rgba(52,211,153,0.15)] to-transparent'
        : 'w-px h-full bg-gradient-to-b from-transparent via-[rgba(52,211,153,0.15)] to-transparent',
      className
    )}
    {...props}
  />
));
Separator.displayName = 'Separator';

export { Separator };
