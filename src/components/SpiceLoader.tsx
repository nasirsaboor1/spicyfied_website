interface SpiceLoaderProps {
  label?: string;
  className?: string;
}

const DOTS = [
  { color: 'bg-saffron', delay: '0ms' },
  { color: 'bg-ochre', delay: '150ms' },
  { color: 'bg-moss', delay: '300ms' },
];

export default function SpiceLoader({ label = 'Loading', className = '' }: SpiceLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`flex items-center justify-center gap-2 py-12 ${className}`}
    >
      {DOTS.map((dot, i) => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${dot.color} motion-safe:animate-bounce motion-reduce:opacity-60`}
          style={{ animationDelay: dot.delay, animationDuration: '900ms' }}
        />
      ))}
    </div>
  );
}
