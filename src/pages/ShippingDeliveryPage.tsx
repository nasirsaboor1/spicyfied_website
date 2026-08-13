import { ArrowLeft } from 'lucide-react';

interface ShippingDeliveryPageProps {
  onNavigateHome: () => void;
}

export default function ShippingDeliveryPage({ onNavigateHome }: ShippingDeliveryPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-[#2d5016] hover:text-[#d4af37] mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-[#2d5016] mb-4">Shipping & Delivery Policy</h1>
          <p className="text-gray-600 mb-8">Last Updated: January 2026</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Shipping Overview</h2>
              <p>
                At SPICYFIED, we are committed to delivering your premium spice products in perfect condition. We process and ship orders promptly to ensure you receive your products as quickly as possible.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Order Processing Time</h2>
              <p className="mb-3">
                Orders are typically processed within 1-2 business days after payment confirmation. During peak seasons or promotional periods, processing may take up to 3-4 business days.
              </p>
              <p>
                Orders placed on weekends or holidays will be processed on the next business day.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Shipping Methods and Delivery Times</h2>
              <p className="mb-3">We offer the following shipping options:</p>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-[#2d5016] mb-2">Standard Shipping</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Delivery Time: 5-7 business days</li>
                    <li>Best for regular orders with no time constraints</li>
                    <li>Most economical shipping option</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-[#2d5016] mb-2">Express Shipping</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Delivery Time: 2-3 business days</li>
                    <li>Ideal for faster delivery needs</li>
                    <li>Additional charges apply</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-[#2d5016] mb-2">Overnight Shipping</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Delivery Time: 1 business day</li>
                    <li>For urgent orders (subject to availability)</li>
                    <li>Premium charges apply</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4 text-sm italic">
                Note: Delivery times are estimates and may vary based on your location and external factors such as weather conditions or courier delays.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Shipping Costs</h2>
              <p className="mb-3">
                Shipping costs are calculated based on:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Order weight and dimensions</li>
                <li>Shipping destination</li>
                <li>Selected shipping method</li>
              </ul>
              <p className="mt-3">
                Final shipping costs will be displayed at checkout before you complete your purchase.
              </p>
              <div className="bg-[#d4af37] bg-opacity-10 border border-[#d4af37] p-4 rounded-lg mt-4">
                <p className="font-semibold text-[#2d5016]">Free Shipping Available!</p>
                <p className="mt-1">Orders over a certain amount may qualify for free standard shipping. Check our promotions page for current offers.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Shipping Locations</h2>
              <p className="mb-3">
                We currently ship to addresses within our service areas. Some remote or restricted locations may not be available for delivery.
              </p>
              <p>
                International shipping may be available upon request. Please contact us at{' '}
                <a href="mailto:southmountainenter@gmail.com" className="text-[#d4af37] hover:underline">
                  southmountainenter@gmail.com
                </a>{' '}
                for international shipping inquiries.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Order Tracking</h2>
              <p className="mb-3">
                Once your order ships, you will receive:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>A shipping confirmation email with tracking information</li>
                <li>A tracking number to monitor your package's journey</li>
                <li>Updates on delivery status through your account dashboard</li>
              </ul>
              <p className="mt-3">
                You can track your order in real-time using the tracking number provided by our courier partner.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Delivery Attempts and Failed Deliveries</h2>
              <p className="mb-3">
                Our courier partners will typically make 2-3 delivery attempts if you are not available to receive the package.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>A delivery notice will be left with instructions for redelivery or pickup</li>
                <li>Packages may be held at a local courier facility for pickup</li>
                <li>After multiple failed attempts, packages may be returned to SPICYFIED</li>
              </ul>
              <p className="mt-3">
                Customers are responsible for providing accurate delivery information. Additional shipping charges may apply for reshipment of returned packages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Damaged or Lost Packages</h2>
              <p className="mb-3">
                If your package arrives damaged or goes missing:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Contact us immediately at{' '}
                  <a href="mailto:southmountainenter@gmail.com" className="text-[#d4af37] hover:underline">
                    southmountainenter@gmail.com
                  </a>
                </li>
                <li>Provide your order number and photos of damaged items (if applicable)</li>
                <li>We will work with the courier to investigate and resolve the issue</li>
                <li>Replacements or refunds will be issued as appropriate</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Delivery Responsibility</h2>
              <p>
                Once the package leaves our facility and is handed to the courier, SPICYFIED is not liable for delays, damages, or losses caused by the shipping carrier. However, we will assist you in filing claims and resolving issues with the courier to ensure customer satisfaction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Special Delivery Instructions</h2>
              <p className="mb-3">
                During checkout, you may provide special delivery instructions such as:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Gate codes or building access information</li>
                <li>Safe place to leave the package</li>
                <li>Alternative contact person for delivery</li>
              </ul>
              <p className="mt-3">
                Please note that we cannot guarantee couriers will follow special instructions, but we will communicate your preferences to them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Holiday Shipping</h2>
              <p>
                During major holidays, shipping times may be extended due to high order volumes and courier schedules. We recommend placing orders well in advance during holiday seasons to ensure timely delivery.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Contact Us</h2>
              <p>
                For any questions about shipping, delivery, or to track your order, please contact our customer support team:
              </p>
              <p className="mt-3">
                <strong>Email:</strong>{' '}
                <a href="mailto:southmountainenter@gmail.com" className="text-[#d4af37] hover:underline">
                  southmountainenter@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
