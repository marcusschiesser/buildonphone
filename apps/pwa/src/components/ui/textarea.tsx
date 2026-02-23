import * as React from 'react';

export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  return (
    <textarea
      ref={ref}
      {...props}
      className="w-full resize-none rounded-2xl border border-zinc-700 bg-black/35 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };
