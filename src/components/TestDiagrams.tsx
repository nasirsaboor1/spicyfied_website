/**
 * Small illustrative SVGs for the "How to know it's real" section.
 * Each one shows the visual difference between real and fake at a
 * glance, so the section communicates before anyone reads the text.
 */

interface DiagramProps {
  className?: string;
}

export function TurmericGlassDiagram({ className = '' }: DiagramProps) {
  return (
    <svg viewBox="0 0 200 100" fill="none" className={className} aria-hidden="true">
      {/* left glass — real: clean yellow water, dust settling at bottom */}
      <g>
        <path d="M20 12 L84 12 L78 88 L26 88 Z" fill="#F5EEDC" stroke="#C9A227" strokeWidth="1" opacity="0.4" />
        {/* clear yellow water body */}
        <path d="M22 22 L82 22 L76 87 L28 87 Z" fill="#E9C15A" opacity="0.55" />
        {/* small settled turmeric at bottom */}
        <path d="M28 82 L76 82 L74 87 L30 87 Z" fill="#B8860B" />
        <text x="52" y="102" fontSize="9" fill="#5B7052" textAnchor="middle" fontWeight="600">REAL</text>
      </g>
      {/* right glass — fake: muddy, colour bleeding, floating residue */}
      <g>
        <path d="M116 12 L180 12 L174 88 L122 88 Z" fill="#F5EEDC" stroke="#8A3D1D" strokeWidth="1" opacity="0.4" />
        {/* muddy orange-red water */}
        <path d="M118 22 L178 22 L172 87 L124 87 Z" fill="#C25C2E" opacity="0.65" />
        {/* swirls */}
        <path d="M124 40 Q148 30 172 42" stroke="#8A3D1D" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M126 55 Q148 65 170 55" stroke="#8A3D1D" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M128 70 Q148 60 168 70" stroke="#8A3D1D" strokeWidth="1.5" fill="none" opacity="0.5" />
        <text x="148" y="102" fontSize="9" fill="#8A3D1D" textAnchor="middle" fontWeight="600">FAKE</text>
      </g>
    </svg>
  );
}

export function CinnamonBarkDiagram({ className = '' }: DiagramProps) {
  return (
    <svg viewBox="0 0 200 100" fill="none" className={className} aria-hidden="true">
      {/* left: real Ceylon — thin, tightly rolled multiple layers visible at end */}
      <g>
        {/* thin quill body */}
        <path d="M22 30 L84 30 L84 50 L22 50 Z" fill="#A0693A" />
        {/* rolled end — multiple concentric layers */}
        <ellipse cx="22" cy="40" rx="4" ry="10" fill="#8B5A2B" />
        <ellipse cx="22" cy="40" rx="2.5" ry="6" fill="#6F4520" />
        <ellipse cx="22" cy="40" rx="1.3" ry="3" fill="#4A2E15" />
        {/* other end also rolled */}
        <ellipse cx="84" cy="40" rx="4" ry="10" fill="#8B5A2B" />
        <ellipse cx="84" cy="40" rx="2.5" ry="6" fill="#6F4520" />
        <ellipse cx="84" cy="40" rx="1.3" ry="3" fill="#4A2E15" />
        <text x="53" y="72" fontSize="9" fill="#5B7052" textAnchor="middle" fontWeight="600">CEYLON</text>
        <text x="53" y="85" fontSize="7" fill="#5B7052" textAnchor="middle">thin, layered curl</text>
      </g>
      {/* right: cassia — thick, hard, single flat/curled bark */}
      <g>
        {/* thick single-layer bark */}
        <path d="M116 22 L178 22 L178 58 L116 58 Z" fill="#6F4520" />
        <path d="M116 22 L178 22 L178 58 L116 58 Z" fill="#4A2E15" opacity="0.3" />
        {/* single thick edge — one solid layer */}
        <rect x="114" y="22" width="4" height="36" fill="#3A2410" />
        <rect x="176" y="22" width="4" height="36" fill="#3A2410" />
        {/* woody texture */}
        <path d="M120 30 L174 32" stroke="#3A2410" strokeWidth="0.7" opacity="0.5" />
        <path d="M120 42 L174 44" stroke="#3A2410" strokeWidth="0.7" opacity="0.5" />
        <text x="147" y="72" fontSize="9" fill="#8A3D1D" textAnchor="middle" fontWeight="600">CASSIA</text>
        <text x="147" y="85" fontSize="7" fill="#8A3D1D" textAnchor="middle">thick, flat, single bark</text>
      </g>
    </svg>
  );
}

export function CardamomPodDiagram({ className = '' }: DiagramProps) {
  return (
    <svg viewBox="0 0 200 100" fill="none" className={className} aria-hidden="true">
      {/* left: fresh pod — plump, bright green, seeds visible when split */}
      <g>
        {/* whole plump pod */}
        <ellipse cx="42" cy="45" rx="14" ry="26" fill="#A3B78A" />
        <path d="M42 22 L38 30 L46 30 Z" fill="#7C9668" />
        <path d="M42 24 L42 68" stroke="#5F7B48" strokeWidth="0.7" opacity="0.6" />
        {/* small squeeze marks */}
        <path d="M34 40 Q30 45 34 50" stroke="#5F7B48" strokeWidth="0.6" fill="none" opacity="0.7" />
        <path d="M50 40 Q54 45 50 50" stroke="#5F7B48" strokeWidth="0.6" fill="none" opacity="0.7" />
        {/* aroma waves */}
        <path d="M62 30 Q68 26 74 30" stroke="#C9A227" strokeWidth="1" fill="none" opacity="0.7" />
        <path d="M62 40 Q70 36 78 40" stroke="#C9A227" strokeWidth="1" fill="none" opacity="0.7" />
        <path d="M62 50 Q68 46 74 50" stroke="#C9A227" strokeWidth="1" fill="none" opacity="0.7" />
        <text x="42" y="85" fontSize="9" fill="#5B7052" textAnchor="middle" fontWeight="600">FRESH</text>
        <text x="42" y="97" fontSize="7" fill="#5B7052" textAnchor="middle">plump, aromatic</text>
      </g>
      {/* right: stale pod — dry, faded, wrinkled */}
      <g>
        {/* wrinkled thinner pod */}
        <ellipse cx="152" cy="45" rx="12" ry="24" fill="#8A9C77" opacity="0.7" />
        <path d="M152 24 L149 30 L155 30 Z" fill="#6B7D5A" />
        {/* wrinkle lines */}
        <path d="M143 30 Q148 45 143 60" stroke="#6B7D5A" strokeWidth="0.6" fill="none" opacity="0.7" />
        <path d="M152 26 Q152 45 152 66" stroke="#6B7D5A" strokeWidth="0.6" fill="none" opacity="0.5" />
        <path d="M161 30 Q156 45 161 60" stroke="#6B7D5A" strokeWidth="0.6" fill="none" opacity="0.7" />
        {/* cracked look */}
        <path d="M148 40 L156 42 L152 46" stroke="#6B7D5A" strokeWidth="0.5" fill="none" opacity="0.6" />
        <text x="152" y="85" fontSize="9" fill="#8A3D1D" textAnchor="middle" fontWeight="600">STALE</text>
        <text x="152" y="97" fontSize="7" fill="#8A3D1D" textAnchor="middle">dry, faded</text>
      </g>
    </svg>
  );
}

export function PepperFloatDiagram({ className = '' }: DiagramProps) {
  return (
    <svg viewBox="0 0 200 100" fill="none" className={className} aria-hidden="true">
      {/* single glass split into two halves showing both spices */}
      <g>
        {/* glass body */}
        <path d="M56 8 L144 8 L138 92 L62 92 Z" fill="#F5EEDC" stroke="#A0693A" strokeWidth="1" opacity="0.5" />
        {/* water */}
        <path d="M58 22 L142 22 L136 91 L64 91 Z" fill="#B8D4E3" opacity="0.5" />
        {/* water surface line */}
        <line x1="58" y1="22" x2="142" y2="22" stroke="#7C9EAF" strokeWidth="1" opacity="0.6" />

        {/* floating papaya seeds at top — small ovals just under surface */}
        <ellipse cx="72" cy="28" rx="3" ry="2" fill="#3E2010" />
        <ellipse cx="86" cy="26" rx="3" ry="2" fill="#3E2010" />
        <ellipse cx="128" cy="27" rx="3" ry="2" fill="#3E2010" />
        <ellipse cx="115" cy="26" rx="3" ry="2" fill="#3E2010" />

        {/* real peppercorns at bottom — perfect spheres */}
        <circle cx="74" cy="82" r="4" fill="#1F1108" />
        <circle cx="88" cy="86" r="4" fill="#1F1108" />
        <circle cx="102" cy="82" r="4" fill="#1F1108" />
        <circle cx="118" cy="86" r="4" fill="#1F1108" />
        <circle cx="128" cy="82" r="4" fill="#1F1108" />

        {/* labels with arrows */}
        <text x="18" y="32" fontSize="8" fill="#8A3D1D" fontWeight="600">FAKE</text>
        <text x="18" y="42" fontSize="7" fill="#8A3D1D">float</text>
        <text x="172" y="88" fontSize="8" fill="#5B7052" fontWeight="600" textAnchor="end">REAL</text>
        <text x="184" y="98" fontSize="7" fill="#5B7052" textAnchor="end">sink</text>
      </g>
    </svg>
  );
}
