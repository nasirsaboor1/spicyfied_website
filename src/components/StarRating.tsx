import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  size = 'md',
  showNumber = false,
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const stars = [1, 2, 3, 4, 5];

  const handleClick = (value: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => {
        const filled = star <= rating;
        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            disabled={!interactive}
            aria-label={interactive ? `Rate ${star} star${star === 1 ? '' : 's'}` : undefined}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star
              className={`${sizeClasses[size]} ${
                filled ? 'fill-ochre text-ochre' : 'text-charcoal/20'
              }`}
            />
          </button>
        );
      })}
      {showNumber && (
        <span className="ml-2 text-sm text-charcoal/70">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
