/** The Want MCP mark: a price tag with a heart-shaped punch hole. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h9.36a2.5 2.5 0 0 1 1.77.73l10.6 10.6a2.5 2.5 0 0 1 0 3.54l-9.36 9.36a2.5 2.5 0 0 1-3.54 0L4.73 17.63A2.5 2.5 0 0 1 4 15.86Z"
        fill="var(--action)"
      />
      <path
        d="M10.4 8.2c.9 0 1.6.6 1.9 1.3.3-.7 1-1.3 1.9-1.3 1.2 0 2 .9 2 2.1 0 1.9-2.4 3.3-3.9 4.4-1.5-1.1-3.9-2.5-3.9-4.4 0-1.2.8-2.1 2-2.1Z"
        fill="var(--action-ink)"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <LogoMark size={24} />
      <span className="text-[1.05rem] font-semibold tracking-[-0.02em] leading-none">
        The Want MCP
      </span>
    </span>
  );
}
