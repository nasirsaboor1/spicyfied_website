import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader, ThumbsUp, CheckCircle, MessageSquare } from 'lucide-react';
import StarRating from './StarRating';

interface Review {
  id: string;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  customer: {
    full_name: string;
  };
  user_voted?: boolean;
}

interface ProductReviewsProps {
  productId: string;
  averageRating: number;
  totalReviews: number;
}

export default function ProductReviews({ productId, averageRating, totalReviews }: ProductReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful'>('recent');

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
  });

  useEffect(() => {
    loadReviews();
    if (user) {
      checkReviewEligibility();
    }
  }, [productId, user, sortBy]);

  const loadReviews = async () => {
    try {
      let query = supabase
        .from('product_reviews')
        .select(`
          *,
          customer:customers(full_name)
        `)
        .eq('product_id', productId)
        .eq('is_approved', true);

      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('helpful_count', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      if (user) {
        const reviewsWithVotes = await Promise.all(
          (data || []).map(async (review) => {
            const { data: voteData } = await supabase
              .from('review_votes')
              .select('is_helpful')
              .eq('review_id', review.id)
              .eq('customer_id', user.id)
              .maybeSingle();

            return {
              ...review,
              user_voted: voteData !== null,
            };
          })
        );
        setReviews(reviewsWithVotes);
      } else {
        setReviews(data || []);
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkReviewEligibility = async () => {
    if (!user) return;

    try {
      const { data: existingReview } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('customer_id', user.id)
        .maybeSingle();

      if (existingReview) {
        setHasReviewed(true);
        return;
      }

      const { data: orderData } = await supabase
        .from('order_items')
        .select('order_id, orders!inner(customer_id, status)')
        .eq('product_id', productId)
        .eq('orders.customer_id', user.id)
        .in('orders.status', ['delivered'])
        .limit(1);

      setCanReview(!!orderData && orderData.length > 0);
    } catch (err) {
      console.error('Error checking review eligibility:', err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { data: orderData } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('product_id', productId)
        .limit(1)
        .maybeSingle();

      const { error } = await supabase.from('product_reviews').insert({
        product_id: productId,
        customer_id: user.id,
        order_id: orderData?.order_id || null,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        is_verified_purchase: !!orderData,
      });

      if (error) throw error;

      setReviewForm({ rating: 5, comment: '' });
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

  const handleVoteHelpful = async (reviewId: string) => {
    if (!user) {
      alert('Please login to vote');
      return;
    }

    try {
      const { data: existingVote } = await supabase
        .from('review_votes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('customer_id', user.id)
        .maybeSingle();

      if (existingVote) {
        return;
      }

      const { error } = await supabase.from('review_votes').insert({
        review_id: reviewId,
        customer_id: user.id,
        is_helpful: true,
      });

      if (error) throw error;

      await loadReviews();
    } catch (err: any) {
      console.error('Error voting:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-[#211C17]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Reviews</h2>
          <div className="flex items-center gap-4">
            <StarRating rating={averageRating} size="md" showNumber />
            <span className="text-gray-600">({totalReviews} reviews)</span>
          </div>
        </div>

        {user && canReview && !hasReviewed && (
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#211C17] text-white rounded-lg font-semibold hover:bg-[#140F0C] transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            Write Review
          </button>
        )}
      </div>

      {showReviewForm && (
        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-[#211C17]">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
                placeholder="Share your experience with this product..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#211C17] text-white py-2 rounded-lg font-semibold hover:bg-[#140F0C] transition-colors disabled:opacity-50"
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800">Thank you for your review!</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">All Reviews ({reviews.length})</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'recent' | 'helpful')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
        >
          <option value="recent">Most Recent</option>
          <option value="helpful">Most Helpful</option>
        </select>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{review.customer.full_name}</p>
                  {review.is_verified_purchase && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      <CheckCircle className="w-3 h-3" />
                      Verified Purchase
                    </span>
                  )}
                </div>
                <StarRating rating={review.rating} size="sm" />
              </div>
              <p className="text-sm text-gray-500">
                {new Date(review.created_at).toLocaleDateString()}
              </p>
            </div>

            <p className="text-gray-700 mb-4">{review.comment}</p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVoteHelpful(review.id)}
                disabled={review.user_voted}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  review.user_voted
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Helpful ({review.helpful_count})</span>
              </button>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
          </div>
        )}
      </div>
    </div>
  );
}
