import { useState } from 'react';
import { Search, ShoppingCart, Menu, X, User, Package, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onCategoryChange?: (category: string) => void;
  onNavigateToLogin?: () => void;
  onNavigateToSignup?: () => void;
  onNavigateToOrders?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToContact?: () => void;
  onNavigateToRecipes?: () => void;
}

export default function Header({
  onSearch,
  onCategoryChange,
  onNavigateToLogin,
  onNavigateToSignup,
  onNavigateToOrders,
  onNavigateToDashboard,
  onNavigateToContact,
  onNavigateToRecipes
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { getTotalItems, setIsCartOpen } = useCart();
  const { user, customer, signOut } = useAuth();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleCategoryClick = (category: string) => {
    if (onCategoryChange) {
      onCategoryChange(category);
    }
    setIsMenuOpen(false);
  };

  const totalItems = getTotalItems();

  const navLinkClass =
    'relative font-medium tracking-wide after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-saffron-light after:transition-all after:duration-300 hover:after:w-full hover:text-saffron-light transition-colors';

  return (
    <header className="bg-ink text-cream sticky top-0 z-50 shadow-lg shadow-black/20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4 cursor-pointer pl-5" onClick={() => window.location.href = '/'}>
            <img src="/spicyfied_logo_.jpeg" alt="Spicyfied" className="h-12 md:h-16 w-auto object-cover transition-transform hover:scale-105" />
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-wide text-cream">Spicyfied</h1>
              <p className="text-saffron-light text-xs font-medium tracking-[0.2em] uppercase">Choose Pure, Choose Us</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="/" className={navLinkClass}>Home</a>
            <a href="/shop" className={navLinkClass} onClick={(e) => { e.preventDefault(); handleCategoryClick('all'); }}>Shop</a>
            <div className="relative group">
              <button className={navLinkClass}>Categories</button>
              <div className="absolute top-full left-0 mt-2 w-48 bg-white text-ink rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <a href="/shop?category=whole-spices" className="block px-4 py-3 hover:bg-cream-soft" onClick={(e) => { e.preventDefault(); handleCategoryClick('whole-spices'); }}>Whole Spices</a>
                <a href="/shop?category=dry-fruits" className="block px-4 py-3 hover:bg-cream-soft" onClick={(e) => { e.preventDefault(); handleCategoryClick('dry-fruits'); }}>Dry Fruits</a>
                <a href="/shop?category=seeds" className="block px-4 py-3 hover:bg-cream-soft" onClick={(e) => { e.preventDefault(); handleCategoryClick('seeds'); }}>Seeds</a>
                <div className="px-4 py-3 text-gray-400 border-t">Blended Spices (Coming Soon)</div>
              </div>
            </div>
            <a href="/recipes" className={navLinkClass} onClick={(e) => { e.preventDefault(); onNavigateToRecipes?.(); }}>Recipes</a>
            <a href="/contact" className={navLinkClass} onClick={(e) => { e.preventDefault(); onNavigateToContact?.(); }}>Contact Us</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 rounded-full bg-white/10 border border-white/20 text-cream placeholder-cream/50 focus:outline-none focus:bg-white/20 focus:border-saffron-light transition-all w-64"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/60" />
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-saffron-light text-ink text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <div className="w-8 h-8 bg-saffron-light rounded-full flex items-center justify-center text-ink font-bold">
                    {(customer?.full_name || user.email || '?')[0].toUpperCase()}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white text-ink rounded-lg shadow-xl py-2">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="font-semibold text-ink">{customer?.full_name || 'My Account'}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        onNavigateToDashboard?.();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-cream-soft flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToOrders?.();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-cream-soft flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      My Orders
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-cream-soft flex items-center gap-2 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onNavigateToLogin}
                  className="px-4 py-2 text-cream hover:bg-white/10 rounded-lg transition-colors font-medium"
                >
                  Login
                </button>
                <button
                  onClick={onNavigateToSignup}
                  className="px-4 py-2 bg-saffron-light text-ink rounded-lg font-medium hover:bg-saffron transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-saffron-light text-ink text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Open menu"
              className="p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-3 border-t border-white/20 pt-4">
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-white/10 border border-white/20 text-cream placeholder-cream/50 focus:outline-none focus:bg-white/20 focus:border-saffron-light"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/60" />
            </div>
            <a href="/" className="block hover:text-saffron-light transition-colors font-medium">Home</a>
            <a href="/shop" className="block hover:text-saffron-light transition-colors font-medium" onClick={(e) => { e.preventDefault(); handleCategoryClick('all'); }}>Shop</a>
            <div className="pl-4 space-y-2">
              <a href="/shop?category=whole-spices" className="block text-sm hover:text-saffron-light" onClick={(e) => { e.preventDefault(); handleCategoryClick('whole-spices'); }}>Whole Spices</a>
              <a href="/shop?category=dry-fruits" className="block text-sm hover:text-saffron-light" onClick={(e) => { e.preventDefault(); handleCategoryClick('dry-fruits'); }}>Dry Fruits</a>
              <a href="/shop?category=seeds" className="block text-sm hover:text-saffron-light" onClick={(e) => { e.preventDefault(); handleCategoryClick('seeds'); }}>Seeds</a>
              <div className="text-sm text-cream/50">Blended Spices (Coming Soon)</div>
            </div>
            <a href="/recipes" className="block hover:text-saffron-light transition-colors font-medium" onClick={(e) => { e.preventDefault(); onNavigateToRecipes?.(); setIsMenuOpen(false); }}>Recipes</a>
            <a href="/contact" className="block hover:text-saffron-light transition-colors font-medium" onClick={(e) => { e.preventDefault(); onNavigateToContact?.(); setIsMenuOpen(false); }}>Contact Us</a>

            {user ? (
              <>
                <button
                  onClick={() => { onNavigateToDashboard?.(); setIsMenuOpen(false); }}
                  className="flex items-center gap-2 hover:text-saffron-light transition-colors font-medium"
                >
                  <User className="w-5 h-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => { onNavigateToOrders?.(); setIsMenuOpen(false); }}
                  className="flex items-center gap-2 hover:text-saffron-light transition-colors font-medium"
                >
                  <Package className="w-5 h-5" />
                  My Orders
                </button>
                <button
                  onClick={() => { signOut(); setIsMenuOpen(false); }}
                  className="flex items-center gap-2 hover:text-saffron-light transition-colors font-medium text-red-400"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="space-y-2 pt-2 border-t border-white/20">
                <button
                  onClick={() => { onNavigateToLogin?.(); setIsMenuOpen(false); }}
                  className="w-full text-left hover:text-saffron-light transition-colors font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => { onNavigateToSignup?.(); setIsMenuOpen(false); }}
                  className="w-full text-left hover:text-saffron-light transition-colors font-medium"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
