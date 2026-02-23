import * as React from 'react';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Teal glow – primary call-to-action
  default: 'nm-btn-accent bg-accent/15 text-accent font-semibold rounded-2xl',
  // Sky-blue glow – secondary primary action
  secondary: 'nm-btn-accent2 bg-accent-2/15 text-accent-2 font-semibold rounded-xl',
  // Raised neutral – confirm / save actions with accent text
  outline: 'nm-btn bg-ink text-accent rounded-xl',
  // Flat neutral – secondary actions (cancel, rename…)
  ghost: 'nm-flat bg-ink text-zinc-300 rounded-xl hover:text-zinc-100',
  // Raised with danger tint – destructive / delete actions
  destructive: 'nm-btn bg-ink text-[--accent-danger] rounded-xl',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'px-4 py-2',
  sm: 'px-3 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  icon: 'h-9 w-9',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', type = 'button', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        {...props}
        className={[
          'inline-flex items-center justify-center',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
        ].join(' ')}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
