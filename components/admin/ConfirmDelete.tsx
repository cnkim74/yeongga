"use client";

export function ConfirmDelete({
  action,
  hidden,
  message,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string | number>;
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
