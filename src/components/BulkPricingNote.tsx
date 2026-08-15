import { Info } from 'lucide-react';

interface BulkPricingNoteProps {
  className?: string;
}

export default function BulkPricingNote({ className = '' }: BulkPricingNoteProps) {
  return (
    <div
      className={`flex items-start gap-2 bg-[#d4af37]/10 border border-[#d4af37]/40 rounded-lg px-4 py-3 text-sm text-[#5c4a00] ${className}`}
    >
      <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#a3841c]" />
      <p>
        <span className="font-semibold">Ordering in bulk?</span> Bulk quantities have different
        pricing. Contact us directly for a custom quote.
      </p>
    </div>
  );
}
