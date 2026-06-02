import { Loader2 } from 'lucide-react';

export default function LoadingButton({
  loading = false,
  loadingText = 'Loading...',
  children,
  className = 'btn-primary',
  disabled,
  icon: Icon,
  type = 'button',
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      className={className}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="h-4 w-4" aria-hidden="true" />
      ) : null}
      {loading ? loadingText : children}
    </button>
  );
}
