import { Info } from 'lucide-react';

interface BulkPricingNoteProps {
  className?: string;
}

export default function BulkPricingNote({ className = '' }: BulkPricingNoteProps) {
  return (
    <div
      className={`flex items-start gap-2 bg-ochre/10 border border-ochre/40 rounded-lg px-4 py-3 text-sm text-ink ${className}`}
    >
      <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-ochre" />
      <p>
        <span className="font-semibold">Ordering in bulk?</span> Bulk quantities have different
        pricing. Contact us directly for a custom quote.
      </p>
    </div>
  );
}
