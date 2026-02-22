import * as React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      {...props}
      className="w-full rounded-xl border border-zinc-700 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
});

Input.displayName = 'Input';

export { Input };
