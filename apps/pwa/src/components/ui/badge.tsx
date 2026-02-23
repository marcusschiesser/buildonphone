import * as React from 'react';

export type BadgeVariant = 'default' | 'secondary' | 'warning';

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'className'> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  // Cyan – highlighted / featured items (e.g. "Default" app badge)
  default: 'border-cyan-300/50 bg-cyan-400/10 text-cyan-200',
  // Zinc – neutral / generic items (e.g. "My App" badge)
  secondary: 'border-zinc-500/60 bg-zinc-800/40 text-zinc-300',
  // Amber + pulse – in-progress status (e.g. "Generating…" badge)
  warning: 'animate-pulse border-amber-300/40 bg-amber-400/10 text-amber-200',
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        {...props}
        className={[
          'inline-flex items-center rounded-full border px-2 py-0.5',
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
