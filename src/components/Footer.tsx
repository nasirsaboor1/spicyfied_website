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
    <footer className="bg-[#2d5016] text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/spice_logojpg).jpg" alt="Spicyfied" className="h-12 w-12 rounded-full object-cover" />
              <div>
                <h3 className="text-xl font-bold">SPICYFIED</h3>
                <p className="text-[#d4af37] text-xs">Choose Pure Choose Us</p>
              </div>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              Your trusted source for premium quality spices, dry fruits, and seeds. We bring you the finest products sourced from the best regions, ensuring purity and freshness in every pack.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4 text-[#d4af37]">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-[#d4af37] transition-colors">Home</a></li>
              <li><a href="/shop" className="hover:text-[#d4af37] transition-colors">Shop</a></li>
              <li><a href="/shop?category=whole-spices" className="hover:text-[#d4af37] transition-colors">Whole Spices</a></li>
              <li><a href="/shop?category=dry-fruits" className="hover:text-[#d4af37] transition-colors">Dry Fruits</a></li>
              <li><a href="/shop?category=seeds" className="hover:text-[#d4af37] transition-colors">Seeds</a></li>
              <li>
                <button
                  onClick={onNavigateToContact}
                  className="hover:text-[#d4af37] transition-colors text-left"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4 text-[#d4af37]">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-white/80">Everyday Essentials</span></li>
              <li><span className="text-white/80">Healthy Snacking</span></li>
              <li><span className="text-white/50">Blended Spices (Coming Soon)</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4 text-[#d4af37]">Legal & Policies</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={onNavigateToPrivacy}
                  className="hover:text-[#d4af37] transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToTerms}
                  className="hover:text-[#d4af37] transition-colors text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToShipping}
                  className="hover:text-[#d4af37] transition-colors text-left"
                >
                  Shipping & Delivery
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToRefund}
                  className="hover:text-[#d4af37] transition-colors text-left"
                >
                  Cancellation & Refund
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/60">
            &copy; {new Date().getFullYear()} Spicyfied. All rights reserved.
          </p>
          <p className="text-sm text-white/60 flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-[#d4af37] fill-current" /> for quality and purity
          </p>
        </div>
      </div>
    </footer>
  );
}
