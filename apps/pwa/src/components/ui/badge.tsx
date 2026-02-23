import * as React from 'react';

export type BadgeVariant = 'default' | 'secondary' | 'warning';

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'className'> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  // Teal – highlighted / featured items
  default: 'nm-raised-sm bg-accent/10 text-accent',
  // Neutral – generic items
  secondary: 'nm-flat bg-ink text-[--text-2]',
  // Amber + pulse – in-progress status
  warning: 'animate-pulse nm-flat bg-[--accent-warn]/10 text-[--accent-warn]',
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        {...props}
        className={[
          'inline-flex items-center rounded-full px-2 py-0.5',
          'text-[10px] font-semibold uppercase tracking-wide',
          variantClasses[variant],
        ].join(' ')}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
