import * as React from 'react';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      {...props}
      className="w-full rounded-xl nm-inset bg-ink px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-[--text-3] focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
});

Input.displayName = 'Input';

export { Input };
