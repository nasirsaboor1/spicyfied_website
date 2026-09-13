import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader, CheckCircle, MessageSquare } from 'lucide-react';
import StarRating from './StarRating';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean | null;
  created_at: string | null;
}

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
  });

  useEffect(() => {
    loadReviews();
    if (user) {
      checkHasReviewed();
    }
  }, [productId, user]);

  const checkHasReviewed = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .maybeSingle();
    setHasReviewed(!!data);
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, title, comment, is_verified_purchase, created_at')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        product_id: productId,
        user_id: user.id,
        rating: reviewForm.rating,
        title: reviewForm.title || null,
        comment: reviewForm.comment,
      });

      if (error) throw error;

      setReviewForm({ rating: 5, title: '', comment: '' });
      setShowReviewForm(false);
      setHasReviewed(true);
      await loadReviews();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-4">
              <StarRating rating={averageRating} size="md" showNumber />
              <span className="text-gray-600">({reviews.length} reviews)</span>
            </div>
          )}
        </div>

        {user && !hasReviewed && (
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg font-semibold hover:bg-ink-light transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            Write Review
          </button>
        )}
      </div>

      {showReviewForm && (
        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-ink">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Write Your Review</h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating
              </label>
              <StarRating
                rating={reviewForm.rating}
                size="lg"
                interactive
                onRatingChange={(rating) => setReviewForm({ ...reviewForm, rating })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                required
                rows={4}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                placeholder="Share your experience with this product..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-ink text-white py-2 rounded-lg font-semibold hover:bg-ink-light transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {hasReviewed && !showReviewForm && (
        <div className="bg-sage-tint border border-moss/30 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-brand-green" />
          <p className="text-ink">Thank you for your review!</p>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {review.title && <p className="font-semibold text-gray-900">{review.title}</p>}
                  {review.is_verified_purchase && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-sage-tint text-ink text-xs font-semibold rounded">
                      <CheckCircle className="w-3 h-3" />
                      Verified Purchase
                    </span>
                  )}
                </div>
                <StarRating rating={review.rating} size="sm" />
              </div>
              <p className="text-sm text-gray-500">
                {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
              </p>
            </div>

            {review.comment && <p className="text-gray-700">{review.comment}</p>}
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No reviews yet. Be the first to review this product.</p>
          </div>
        )}
      </div>
    </div>
  );
}
