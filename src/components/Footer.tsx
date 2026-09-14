import { Heart } from 'lucide-react';

interface FooterProps {
  onNavigateToPrivacy: () => void;
  onNavigateToTerms: () => void;
  onNavigateToShipping: () => void;
  onNavigateToRefund: () => void;
  onNavigateToContact: () => void;
}

export default function Footer({
  onNavigateToPrivacy,
  onNavigateToTerms,
  onNavigateToShipping,
  onNavigateToRefund,
  onNavigateToContact,
}: FooterProps) {
  return (
    <footer className="bg-ink text-cream/90 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/spice_logojpg).jpg" alt="Spicyfied" className="h-12 w-12 rounded-full object-cover" />
              <div>
                <h3 className="font-serif text-2xl font-semibold">Spicyfied</h3>
                <p className="text-saffron-light text-xs">Choose Pure Choose Us</p>
              </div>
            </div>
            <p className="text-cream/70 text-sm leading-relaxed">
              Spices, dry fruits, and seeds selected for everyday cooking, aroma, and freshness. Packed with care for your kitchen.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4 text-saffron-light">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-saffron-light transition-colors">Home</a></li>
              <li><a href="/shop" className="hover:text-saffron-light transition-colors">Shop</a></li>
              <li><a href="/shop?category=whole-spices" className="hover:text-saffron-light transition-colors">Whole Spices</a></li>
              <li><a href="/shop?category=dry-fruits" className="hover:text-saffron-light transition-colors">Dry Fruits</a></li>
              <li><a href="/shop?category=seeds" className="hover:text-saffron-light transition-colors">Seeds</a></li>
              <li>
                <button
                  onClick={onNavigateToContact}
                  className="hover:text-saffron-light transition-colors text-left"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4 text-saffron-light">Legal & Policies</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={onNavigateToPrivacy}
                  className="hover:text-saffron-light transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToTerms}
                  className="hover:text-saffron-light transition-colors text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToShipping}
                  className="hover:text-saffron-light transition-colors text-left"
                >
                  Shipping & Delivery
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToRefund}
                  className="hover:text-saffron-light transition-colors text-left"
                >
                  Cancellation & Refund
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-cream/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-cream/50">
            &copy; {new Date().getFullYear()} Spicyfied. All rights reserved.
          </p>
          <p className="text-sm text-cream/50 flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-saffron-light fill-current" /> for quality and purity
          </p>
        </div>
      </div>
    </footer>
  );
}
