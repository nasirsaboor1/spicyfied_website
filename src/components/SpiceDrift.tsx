const PARTICLES = [
  { left: '4%', size: 6, color: 'bg-saffron', duration: 14, delay: 0, opacity: 0.6, driftX: 18 },
  { left: '11%', size: 3, color: 'bg-cream', duration: 10, delay: 2, opacity: 0.4, driftX: -10 },
  { left: '18%', size: 5, color: 'bg-paprika-light', duration: 16, delay: 1, opacity: 0.5, driftX: 14 },
  { left: '27%', size: 4, color: 'bg-saffron-light', duration: 12, delay: 4, opacity: 0.55, driftX: -16 },
  { left: '35%', size: 3, color: 'bg-cream', duration: 9, delay: 0.5, opacity: 0.35, driftX: 8 },
  { left: '44%', size: 7, color: 'bg-paprika', duration: 18, delay: 3, opacity: 0.45, driftX: -20 },
  { left: '52%', size: 4, color: 'bg-saffron', duration: 13, delay: 1.5, opacity: 0.5, driftX: 12 },
  { left: '61%', size: 3, color: 'bg-cream', duration: 11, delay: 5, opacity: 0.4, driftX: -8 },
  { left: '69%', size: 5, color: 'bg-saffron-light', duration: 15, delay: 2.5, opacity: 0.5, driftX: 16 },
  { left: '77%', size: 4, color: 'bg-paprika-light', duration: 10, delay: 0, opacity: 0.45, driftX: -14 },
  { left: '85%', size: 6, color: 'bg-saffron', duration: 17, delay: 3.5, opacity: 0.55, driftX: 10 },
  { left: '93%', size: 3, color: 'bg-cream', duration: 9.5, delay: 1, opacity: 0.35, driftX: -12 },
];

export default function SpiceDrift() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={`motion-safe:animate-drift absolute bottom-0 rounded-full ${p.color} blur-[0.5px]`}
          style={
            {
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              '--drift-opacity': p.opacity,
              '--drift-x': `${p.driftX}px`,
              '--drift-y': '-140px',
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
