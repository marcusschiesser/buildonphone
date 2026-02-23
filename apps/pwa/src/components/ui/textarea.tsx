import * as React from 'react';

export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  return (
    <textarea
      ref={ref}
      {...props}
      className="w-full resize-none rounded-2xl nm-inset bg-ink p-3 text-sm text-zinc-100 outline-none placeholder:text-[--text-3] focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };
