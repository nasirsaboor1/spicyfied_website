import { ArrowLeft } from 'lucide-react';

interface RefundCancellationPageProps {
  onNavigateHome: () => void;
}

export default function RefundCancellationPage({ onNavigateHome }: RefundCancellationPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-[#211C17] hover:text-[#d4af37] mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-[#211C17] mb-4">Cancellation & Refund Policy</h1>
          <p className="text-gray-600 mb-8">Last Updated: January 2026</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-[#211C17] mb-4">Order Cancellation Policy</h2>
              <p className="mb-3">
                Customers may cancel their orders within <strong>6 hours</strong> of placing them. This cut-off time is critical to manage our inventory and processing efficiently.
              </p>
              <p>
                Once an order has been processed, we are unable to accept cancellations. Processing typically begins immediately after the 6-hour window closes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#211C17] mb-4">Delivery and Liability</h2>
              <p className="mb-3">
                SPICYFIED strives to ensure the timely delivery of all orders.
              </p>
              <p>
                We shall not be held liable for any delays in delivery once the order has left our facility. Factors beyond our control, such as courier issues or weather conditions, may impact delivery times.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#211C17] mb-4">Refunds for Cancellations</h2>
              <p>
                In cases where cancellations are made within the allowable time frame, or due to unforeseen circumstances deemed acceptable by SPICYFIED, refunds will be issued to the source of payment within <strong>7-10 days</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#211C17] mb-4">Fraudulent Transactions and Misuse</h2>
              <p className="mb-3">
                SPICYFIED actively monitors all transactions for fraudulent activity and reserves the right to cancel orders that are suspected to be fraudulent.
              </p>
              <p className="mb-3">
                Orders that are in violation of our website's terms of use may also be subject to cancellation at our discretion.
              </p>
              <p>
                Customers involved in fraudulent transactions or violations of our terms of use may be barred from future purchases on our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#211C17] mb-4">Contact and Support</h2>
              <p>
                <strong>Customer Care:</strong> For any queries or further information regarding our cancellation and refund policies, please contact our customer care team at{' '}
                <a href="mailto:southmountainenter@gmail.com" className="text-[#d4af37] hover:underline">
                  southmountainenter@gmail.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#211C17] mb-4">Policy Modifications</h2>
              <p>
                <strong>Policy Updates:</strong> SPICYFIED reserves the right to modify this cancellation and refund policy at any time. Changes will be effective immediately upon posting on our website and will apply to all orders placed thereafter.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
