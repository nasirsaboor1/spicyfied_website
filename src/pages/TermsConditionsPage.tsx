import { ArrowLeft } from 'lucide-react';

interface TermsConditionsPageProps {
  onNavigateHome: () => void;
}

export default function TermsConditionsPage({ onNavigateHome }: TermsConditionsPageProps) {
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
          <h1 className="text-4xl font-bold text-[#2d5016] mb-4">Terms & Conditions</h1>
          <p className="text-gray-600 mb-8">Last Updated: January 2026</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Agreement to Terms</h2>
              <p>
                By accessing and using the SPICYFIED website, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these Terms & Conditions, please do not use our website or purchase our products.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Use of Website</h2>
              <p className="mb-3">By using this website, you warrant that:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You are at least 18 years of age or have parental/guardian consent</li>
                <li>You will use the website only for lawful purposes</li>
                <li>You will not engage in any activity that interferes with or disrupts the website</li>
                <li>You will not attempt to gain unauthorized access to any portion of the website</li>
                <li>You will provide accurate and complete information when creating an account or placing orders</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Account Registration</h2>
              <p className="mb-3">
                When you create an account with SPICYFIED, you are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
                <li>Ensuring your account information is accurate and up-to-date</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Product Information and Availability</h2>
              <p className="mb-3">
                We strive to provide accurate product descriptions, images, and pricing. However:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Product colors and images may vary slightly from actual products due to screen settings</li>
                <li>We reserve the right to limit quantities of products offered on our website</li>
                <li>We reserve the right to discontinue any product at any time</li>
                <li>Pricing is subject to change without notice</li>
                <li>We do not guarantee that product descriptions or other content are error-free</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Orders and Payment</h2>
              <p className="mb-3">
                When placing an order:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You agree to provide current, complete, and accurate purchase and account information</li>
                <li>We reserve the right to refuse or cancel any order at our discretion</li>
                <li>Payment must be received before order processing</li>
                <li>All prices are in the currency specified on the website</li>
                <li>We accept various payment methods as indicated during checkout</li>
                <li>By providing payment information, you represent that you are authorized to use that payment method</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Intellectual Property Rights</h2>
              <p className="mb-3">
                All content on this website, including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Text, graphics, logos, images, and software</li>
                <li>Product names, designs, and trademarks</li>
                <li>Website design and layout</li>
              </ul>
              <p className="mt-3">
                are the property of SPICYFIED or its content suppliers and are protected by intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without our express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Product Usage and Safety</h2>
              <p className="mb-3">
                Our spice products are intended for culinary use. Please note:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use products according to recommended guidelines and recipes</li>
                <li>Store products in a cool, dry place away from direct sunlight</li>
                <li>Check for allergen information on product labels</li>
                <li>Discontinue use if you experience any adverse reactions</li>
                <li>Keep products out of reach of children</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Limitation of Liability</h2>
              <p className="mb-3">
                To the fullest extent permitted by law:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>SPICYFIED shall not be liable for any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Our total liability for any claims shall not exceed the amount you paid for the product in question</li>
                <li>We are not responsible for delays or failures in performance resulting from circumstances beyond our reasonable control</li>
                <li>We do not guarantee that the website will be uninterrupted, secure, or error-free</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">User Reviews and Content</h2>
              <p className="mb-3">
                If you submit reviews, comments, or other content to our website:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You grant SPICYFIED a non-exclusive, royalty-free license to use, reproduce, and display such content</li>
                <li>You represent that you own or have rights to the content you submit</li>
                <li>Your content must not be offensive, defamatory, or violate any laws</li>
                <li>We reserve the right to remove any content at our discretion</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Links to Third-Party Websites</h2>
              <p>
                Our website may contain links to third-party websites. These links are provided for your convenience only. We do not endorse or assume responsibility for the content, privacy policies, or practices of third-party sites.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Governing Law</h2>
              <p>
                These Terms & Conditions shall be governed by and construed in accordance with the laws of the jurisdiction in which SPICYFIED operates, without regard to conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Changes to Terms</h2>
              <p>
                We reserve the right to update or modify these Terms & Conditions at any time without prior notice. Changes will be effective immediately upon posting to the website. Your continued use of the website after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Severability</h2>
              <p>
                If any provision of these Terms & Conditions is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#2d5016] mb-4">Contact Information</h2>
              <p>
                For any questions or concerns regarding these Terms & Conditions, please contact us at:
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
