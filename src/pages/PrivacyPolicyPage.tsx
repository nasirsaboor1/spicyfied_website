import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigateHome: () => void;
}

export default function PrivacyPolicyPage({ onNavigateHome }: PrivacyPolicyPageProps) {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-ink hover:text-saffron-light mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <div>
          <h1 className="text-[22px] md:text-2xl font-semibold text-ink mb-4">Privacy Policy</h1>
          <p className="text-charcoal/60 text-sm mb-8">Last Updated: January 2026</p>

          <div className="space-y-8 text-charcoal leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Introduction</h2>
              <p>
                At SPICYFIED, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy outlines how we collect, use, store, and protect your data when you visit our website or make a purchase.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Information We Collect</h2>
              <p className="mb-3">We collect the following types of information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Personal Information:</strong> Name, email address, phone number, shipping address, and billing information when you create an account or place an order.</li>
                <li><strong>Order Information:</strong> Details about your purchases, order history, and preferences.</li>
                <li><strong>Technical Information:</strong> IP address, browser type, device information, and browsing behavior through cookies and analytics tools.</li>
                <li><strong>Communication Data:</strong> Records of your correspondence with our customer support team.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">How We Use Your Information</h2>
              <p className="mb-3">We use your information for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Processing and fulfilling your orders</li>
                <li>Communicating with you about your orders, delivery status, and customer service inquiries</li>
                <li>Sending promotional emails and marketing communications (with your consent)</li>
                <li>Improving our website, products, and services</li>
                <li>Preventing fraudulent transactions and ensuring website security</li>
                <li>Complying with legal obligations and resolving disputes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Cookies and Tracking Technologies</h2>
              <p className="mb-3">
                We use cookies and similar tracking technologies to enhance your browsing experience, analyze website traffic, and understand user behavior. Cookies are small text files stored on your device.
              </p>
              <p>
                You can control cookie settings through your browser preferences. However, disabling cookies may affect certain features of our website.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Data Sharing and Disclosure</h2>
              <p className="mb-3">We do not sell, rent, or trade your personal information to third parties. We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Providers:</strong> Payment processors, shipping carriers, and technology service providers who assist in operating our website and fulfilling orders.</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights, property, or safety.</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Your Rights and Choices</h2>
              <p className="mb-3">You have the following rights regarding your personal information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information.</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal requirements.</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time.</li>
                <li><strong>Data Portability:</strong> Request your data in a structured, machine-readable format.</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, please contact us at{' '}
                <a href="mailto:southmountainenter@gmail.com" className="text-saffron-light hover:underline">
                  southmountainenter@gmail.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, comply with legal obligations, resolve disputes, and enforce our agreements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Children's Privacy</h2>
              <p>
                Our website is not intended for children under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. Any changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink mb-4">Contact Us</h2>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your personal information, please contact us at:
              </p>
              <p className="mt-3">
                <strong>Email:</strong>{' '}
                <a href="mailto:southmountainenter@gmail.com" className="text-saffron-light hover:underline">
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
