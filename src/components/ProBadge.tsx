type ProBadgeProps = {
  className?: string;
};

const baseClass =
  'inline-flex shrink-0 items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm ring-1 ring-amber-400/30';

export function ProBadge({ className = '' }: ProBadgeProps) {
  return (
    <span className={`${baseClass} ${className}`.trim()} aria-label="Pro subscriber">
      Pro
    </span>
  );
}
