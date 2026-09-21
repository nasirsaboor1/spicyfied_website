import { useState, useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import Footer from './components/Footer';
import Cart from './components/Cart';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import ShippingDeliveryPage from './pages/ShippingDeliveryPage';
import RefundCancellationPage from './pages/RefundCancellationPage';
import ContactPage from './pages/ContactPage';
import RecipesPage from './pages/RecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';

type Page = 'home' | 'shop' | 'product' | 'login' | 'signup' | 'checkout' | 'orders' | 'dashboard' | 'admin' | 'reset-password' | 'privacy' | 'terms' | 'shipping' | 'refund' | 'contact' | 'recipes' | 'recipe';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentProductSlug, setCurrentProductSlug] = useState<string>('');
  const [currentRecipeId, setCurrentRecipeId] = useState<string>('');
  const [initialCuisine, setInitialCuisine] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        setCurrentPage('home');
      } else if (path.startsWith('/product/')) {
        setCurrentPage('product');
        setCurrentProductSlug(path.replace('/product/', ''));
      } else if (path === '/shop') {
        setCurrentPage('shop');
      } else if (path === '/login') {
        setCurrentPage('login');
      } else if (path === '/signup') {
        setCurrentPage('signup');
      } else if (path === '/checkout') {
        setCurrentPage('checkout');
      } else if (path === '/orders') {
        setCurrentPage('orders');
      } else if (path === '/dashboard') {
        setCurrentPage('dashboard');
      } else if (path === '/admin') {
        setCurrentPage('admin');
      } else if (path === '/reset-password') {
        setCurrentPage('reset-password');
      } else if (path === '/privacy') {
        setCurrentPage('privacy');
      } else if (path === '/terms') {
        setCurrentPage('terms');
      } else if (path === '/shipping') {
        setCurrentPage('shipping');
      } else if (path === '/refund') {
        setCurrentPage('refund');
      } else if (path === '/contact') {
        setCurrentPage('contact');
      } else if (path === '/recipes') {
        setCurrentPage('recipes');
      } else if (path.startsWith('/recipes/')) {
        setCurrentPage('recipe');
        setCurrentRecipeId(path.replace('/recipes/', ''));
      }
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState();

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToHome = () => {
    setCurrentPage('home');
    window.history.pushState({}, '', '/');
    window.scrollTo(0, 0);
  };

  const navigateToShop = (category?: string) => {
    setCurrentPage('shop');
    setSelectedCategory(category || 'all');
    window.history.pushState({}, '', '/shop');
    window.scrollTo(0, 0);
  };

  const navigateToProduct = (slug: string) => {
    setCurrentPage('product');
    setCurrentProductSlug(slug);
    window.history.pushState({}, '', `/product/${slug}`);
    window.scrollTo(0, 0);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (currentPage !== 'shop') {
      navigateToShop();
    }
  };

  const handleCategoryChange = (category: string) => {
    navigateToShop(category);
  };

  const navigateToLogin = () => {
    setCurrentPage('login');
    window.history.pushState({}, '', '/login');
    window.scrollTo(0, 0);
  };

  const navigateToCheckout = () => {
    setCurrentPage('checkout');
    window.history.pushState({}, '', '/checkout');
    window.scrollTo(0, 0);
  };

  const navigateToOrders = () => {
    setCurrentPage('orders');
    window.history.pushState({}, '', '/orders');
    window.scrollTo(0, 0);
  };

  const navigateToDashboard = () => {
    setCurrentPage('dashboard');
    window.history.pushState({}, '', '/dashboard');
    window.scrollTo(0, 0);
  };

  const navigateToAdmin = () => {
    setCurrentPage('admin');
    window.history.pushState({}, '', '/admin');
    window.scrollTo(0, 0);
  };

  const handleLoginSuccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminRow) {
        navigateToAdmin();
        return;
      }
    }
    navigateToHome();
  };

  const navigateToPrivacy = () => {
    setCurrentPage('privacy');
    window.history.pushState({}, '', '/privacy');
    window.scrollTo(0, 0);
  };

  const navigateToTerms = () => {
    setCurrentPage('terms');
    window.history.pushState({}, '', '/terms');
    window.scrollTo(0, 0);
  };

  const navigateToShipping = () => {
    setCurrentPage('shipping');
    window.history.pushState({}, '', '/shipping');
    window.scrollTo(0, 0);
  };

  const navigateToRefund = () => {
    setCurrentPage('refund');
    window.history.pushState({}, '', '/refund');
    window.scrollTo(0, 0);
  };

  const navigateToContact = () => {
    setCurrentPage('contact');
    window.history.pushState({}, '', '/contact');
    window.scrollTo(0, 0);
  };

  const navigateToRecipes = (cuisine: string = 'all') => {
    setInitialCuisine(cuisine);
    setCurrentPage('recipes');
    window.history.pushState({}, '', '/recipes');
    window.scrollTo(0, 0);
  };

  const navigateToRecipe = (id: string) => {
    setCurrentRecipeId(id);
    setCurrentPage('recipe');
    window.history.pushState({}, '', `/recipes/${id}`);
    window.scrollTo(0, 0);
  };

  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen bg-cream">
          {currentPage !== 'login' && currentPage !== 'signup' && currentPage !== 'admin' && currentPage !== 'reset-password' && (
            <Header
              onNavigateToHome={navigateToHome}
              onSearch={handleSearch}
              onCategoryChange={handleCategoryChange}
              onNavigateToLogin={navigateToLogin}
              onNavigateToOrders={navigateToOrders}
              onNavigateToDashboard={navigateToDashboard}
              onNavigateToContact={navigateToContact}
              onNavigateToRecipes={() => navigateToRecipes()}
            />
          )}
          {currentPage !== 'login' && currentPage !== 'signup' && currentPage !== 'admin' && currentPage !== 'reset-password' && (
            <Cart onNavigateToCheckout={navigateToCheckout} />
          )}

        {currentPage === 'home' && (
          <HomePage
            onNavigateToProduct={navigateToProduct}
            onNavigateToShop={navigateToShop}
          />
        )}

        {currentPage === 'shop' && (
          <ShopPage
            onNavigateToProduct={navigateToProduct}
            initialCategory={selectedCategory}
            searchQuery={searchQuery}
          />
        )}

        {currentPage === 'product' && (
          <ProductDetailPage
            productSlug={currentProductSlug}
            onNavigateBack={() => navigateToShop()}
            onNavigateToProduct={navigateToProduct}
            onNavigateToCheckout={navigateToCheckout}
            onNavigateHome={navigateToHome}
            onNavigateToLogin={navigateToLogin}
            onNavigateToDashboard={navigateToDashboard}
          />
        )}

        {currentPage === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentPage === 'signup' && (
          <SignupPage
            onNavigateToLogin={navigateToLogin}
            onSignupSuccess={navigateToHome}
          />
        )}

        {currentPage === 'checkout' && (
          <CheckoutPage
            onNavigateToOrders={navigateToOrders}
            onNavigateToLogin={navigateToLogin}
          />
        )}

        {currentPage === 'orders' && (
          <OrdersPage
            onNavigateToLogin={navigateToLogin}
          />
        )}

        {currentPage === 'dashboard' && (
          <DashboardPage
            onNavigateToLogin={navigateToLogin}
            onNavigateToOrders={navigateToOrders}
          />
        )}

        {currentPage === 'admin' && (
          <AdminPage
            onNavigateToLogin={navigateToLogin}
          />
        )}

        {currentPage === 'reset-password' && (
          <ResetPasswordPage onDone={handleLoginSuccess} />
        )}

        {currentPage === 'privacy' && (
          <PrivacyPolicyPage
            onNavigateHome={navigateToHome}
          />
        )}

        {currentPage === 'terms' && (
          <TermsConditionsPage
            onNavigateHome={navigateToHome}
          />
        )}

        {currentPage === 'shipping' && (
          <ShippingDeliveryPage
            onNavigateHome={navigateToHome}
          />
        )}

        {currentPage === 'refund' && (
          <RefundCancellationPage
            onNavigateHome={navigateToHome}
          />
        )}

        {currentPage === 'contact' && (
          <ContactPage
            onNavigateHome={navigateToHome}
          />
        )}

        {currentPage === 'recipes' && (
          <RecipesPage
            onNavigateToRecipe={navigateToRecipe}
            initialCuisine={initialCuisine}
          />
        )}

        {currentPage === 'recipe' && (
          <RecipeDetailPage
            recipeId={currentRecipeId}
            onNavigateBack={() => navigateToRecipes()}
            onNavigateToProduct={navigateToProduct}
          />
        )}

        {currentPage !== 'login' && currentPage !== 'signup' && currentPage !== 'admin' && currentPage !== 'reset-password' && (
          <Footer
            onNavigateToPrivacy={navigateToPrivacy}
            onNavigateToTerms={navigateToTerms}
            onNavigateToShipping={navigateToShipping}
            onNavigateToRefund={navigateToRefund}
            onNavigateToContact={navigateToContact}
          />
        )}
      </div>
    </CartProvider>
    </AuthProvider>
  );
}

export default App;
