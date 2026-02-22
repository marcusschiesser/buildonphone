import * as React from 'react';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Cyan solid – primary call-to-action
  default: 'bg-accent text-black font-semibold rounded-2xl hover:opacity-90',
  // Blue solid – secondary primary action (e.g. Edit)
  secondary: 'bg-accent-2 text-black font-semibold rounded-xl hover:opacity-90',
  // Cyan border – confirm / save actions
  outline: 'border border-cyan-400/50 text-cyan-100 rounded-xl hover:border-cyan-300',
  // Zinc border – neutral secondary actions (cancel, rename, forget …)
  ghost: 'border border-zinc-600 text-zinc-200 rounded-xl hover:border-zinc-400',
  // Red border – destructive / danger actions (delete …)
  destructive: 'border border-red-400/50 text-red-200 rounded-xl hover:border-red-400',
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
          'inline-flex items-center justify-center transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
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
