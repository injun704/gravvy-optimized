/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LocationProvider } from './context/LocationContext';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { ReviewFormModal } from './components/common/ReviewFormModal';
import { CategoryGradientDefs } from './components/common/CategoryGradientDefs';
import { UniAmbientGlow } from './components/common/UniAmbientGlow';
import { INITIAL_PRODUCTS } from './data/products';
import { HOME_PROMOTIONS } from './data/promotions';
import { Product, MainNavTab, CategoryTab, Order } from './types';
import type { AccountSubPage } from './components/account/AccountView';
import { initSmoothScroll, getLenis, scrollToPosition } from './lib/smoothScroll';
import { CategorySlideSkeleton } from './components/navigation/CategorySlideSkeleton';

// Lazy loaded page components
const ProductDetailPage = React.lazy(() => import('./components/product/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const YourWishView = React.lazy(() => import('./components/wishlist/YourWishView').then((m) => ({ default: m.YourWishView })));
const CartPage = React.lazy(() => import('./components/cart/CartPage').then((m) => ({ default: m.CartPage })));
const OrderSummaryPage = React.lazy(() => import('./components/checkout/OrderSummaryPage').then((m) => ({ default: m.OrderSummaryPage })));
const DeliveryInstructionsPage = React.lazy(() => import('./components/checkout/DeliveryInstructionsPage').then((m) => ({ default: m.DeliveryInstructionsPage })));
const PaymentPage = React.lazy(() => import('./components/checkout/PaymentPage').then((m) => ({ default: m.PaymentPage })));
const OrderConfirmationPage = React.lazy(() => import('./components/checkout/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage })));
const HomePage = React.lazy(() => import('./components/home/HomePage').then((m) => ({ default: m.HomePage })));
const FoodMarketplace = React.lazy(() => import('./components/food/FoodMarketplace').then((m) => ({ default: m.FoodMarketplace })));
const GroceryMarketplace = React.lazy(() => import('./components/grocery/GroceryMarketplace').then((m) => ({ default: m.GroceryMarketplace })));
const MedicineMarketplace = React.lazy(() => import('./components/medicine/MedicineMarketplace').then((m) => ({ default: m.MedicineMarketplace })));
const OrdersView = React.lazy(() => import('./components/orders/OrdersView').then((m) => ({ default: m.OrdersView })));
const AccountView = React.lazy(() => import('./components/account/AccountView').then((m) => ({ default: m.AccountView })));
const ProfilePage = React.lazy(() => import('./components/account/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SavedAddressesPage = React.lazy(() => import('./components/account/SavedAddressesPage').then((m) => ({ default: m.SavedAddressesPage })));
const PaymentMethodsPage = React.lazy(() => import('./components/account/PaymentMethodsPage').then((m) => ({ default: m.PaymentMethodsPage })));
const NotificationsPage = React.lazy(() => import('./components/account/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const RecentlyViewedPage = React.lazy(() => import('./components/account/RecentlyViewedPage').then((m) => ({ default: m.RecentlyViewedPage })));
const ReviewsPage = React.lazy(() => import('./components/account/ReviewsPage').then((m) => ({ default: m.ReviewsPage })));
const HelpCenterPage = React.lazy(() => import('./components/account/HelpCenterPage').then((m) => ({ default: m.HelpCenterPage })));
const CustomerSupportPage = React.lazy(() => import('./components/account/CustomerSupportPage').then((m) => ({ default: m.CustomerSupportPage })));
const FaqsPage = React.lazy(() => import('./components/account/FaqsPage').then((m) => ({ default: m.FaqsPage })));
const ContactUsPage = React.lazy(() => import('./components/account/ContactUsPage').then((m) => ({ default: m.ContactUsPage })));
const LegalPage = React.lazy(() => import('./components/account/LegalPage').then((m) => ({ default: m.LegalPage })));
const SearchResultsPage = React.lazy(() => import('./components/search/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage })));
const DedicatedSearchPage = React.lazy(() => import('./components/search/DedicatedSearchPage').then((m) => ({ default: m.DedicatedSearchPage })));
const LocationPage = React.lazy(() => import('./components/location/LocationPage').then((m) => ({ default: m.LocationPage })));
const CustomerAuthModal = React.lazy(() => import('./components/auth/CustomerAuthModal').then((m) => ({ default: m.CustomerAuthModal })));
const AutomatedTestRunner = React.lazy(() => import('./components/qa/AutomatedTestRunner').then((m) => ({ default: m.AutomatedTestRunner })));

const ViewLoadingFallback: React.FC = () => (
  <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-3">
    <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
    <p className="text-[11px] font-bold text-stone-400 tracking-wider uppercase">Loading GRAVVY View...</p>
  </div>
);

interface NavHistoryEntry {
  tab: MainNavTab;
  subPage: AccountSubPage | null;
  category?: CategoryTab;
  searchQuery?: string;
  key: string;
  scrollY: number;
}

const MainAppContent: React.FC = () => {
  const { backgroundStyle, theme, activeCategory, setActiveCategory } = useTheme();
  const { isAuthModalOpen, setIsAuthModalOpen, isAuthenticated } = useAuth();

  // Navigation & Modal states
  const [currentTab, setCurrentTab] = useState<MainNavTab>('home');
  const [accountSubPage, setAccountSubPage] = useState<AccountSubPage | null>(null);

  // Reset account subpage upon logout so stale authenticated subpages don't remain accessible
  useEffect(() => {
    if (!isAuthenticated) {
      setAccountSubPage(null);
    }
  }, [isAuthenticated]);

  // Initialize Lenis smooth scroll for desktop web and smooth touch physics
  useEffect(() => {
    const cleanup = initSmoothScroll();
    return cleanup;
  }, []);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  const [reviewModalProductId, setReviewModalProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmittedQuery, setSearchSubmittedQuery] = useState('');
  const [isDedicatedSearchOpen, setIsDedicatedSearchOpen] = useState(false);
  const [isLocationPageOpen, setIsLocationPageOpen] = useState(false);

  // Checkout Flow Step State
  type CheckoutFlowStep = 'cart' | 'order-summary' | 'delivery-instructions' | 'payment' | 'confirmation';
  const [checkoutStep, setCheckoutStep] = useState<CheckoutFlowStep>('cart');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [addressReturnTarget, setAddressReturnTarget] = useState<'cart' | 'order-summary' | null>(null);
  const [focusedOrderIdForOrdersView, setFocusedOrderIdForOrdersView] = useState<string | null>(null);

  // Global Scroll Position Restoration System
  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  const navigationHistoryRef = useRef<NavHistoryEntry[]>([]);

  // Compute current view's unique key for scroll restoration
  const getCurrentKey = useCallback((): string => {
    if (selectedProduct) return `product:${selectedProduct.id}`;
    if (currentTab === 'search') return `search:${searchSubmittedQuery || 'all'}`;
    if (currentTab === 'account') return accountSubPage ? `account:${accountSubPage}` : 'account';
    if (currentTab === 'wishlist') return 'wishlist';
    if (currentTab === 'cart') return 'cart';
    if (currentTab === 'orders') return 'orders';
    if (currentTab === 'admin') return 'admin';
    if (currentTab === 'home') return `home:${activeCategory}`;
    return currentTab;
  }, [selectedProduct, currentTab, searchSubmittedQuery, accountSubPage, activeCategory]);

  // Reliable scroll restoration helper with requestAnimationFrame confirmation
  const restoreScrollPosition = useCallback((targetKey: string, fallbackY = 0) => {
    const targetY = scrollPositionsRef.current.get(targetKey) ?? fallbackY;
    scrollToPosition(targetY, true);
    requestAnimationFrame(() => {
      scrollToPosition(targetY, true);
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - targetY) > 5) {
          scrollToPosition(targetY, true);
        }
      });
    });
  }, []);

  // Category order for horizontal side slide direction (left vs right)
  const CATEGORY_ORDER: Record<CategoryTab, number> = {
    home: 0,
    food: 1,
    grocery: 2,
    medicine: 3,
  };

  const prevCategoryRef = useRef<CategoryTab>(activeCategory);
  const slideDirection =
    CATEGORY_ORDER[activeCategory] >= CATEGORY_ORDER[prevCategoryRef.current] ? 1 : -1;

  useEffect(() => {
    prevCategoryRef.current = activeCategory;
  }, [activeCategory]);

  // Render target category marketplace ONLY after the side slide animation completes
  const [renderedCategory, setRenderedCategory] = useState<CategoryTab>(activeCategory);

  // Pure horizontal side-slide variants (zero vertical jitter, zero scale distortion)
  const categorySlideVariants: Variants = {
    initial: (dir: number) => ({
      x: dir >= 0 ? '100%' : '-100%',
      opacity: 1,
    }),
    animate: {
      x: '0%',
      opacity: 1,
      transition: {
        x: { type: 'tween', ease: 'easeOut', duration: 0.28 },
      },
    },
    exit: (dir: number) => ({
      x: dir >= 0 ? '-100%' : '100%',
      opacity: 1,
      transition: {
        x: { type: 'tween', ease: 'easeIn', duration: 0.24 },
      },
    }),
  };

  // Synchronize browser history for standard Android hardware/gesture back-button and URL routes support
  useEffect(() => {
    // Check initial search param in URL
    const params = new URLSearchParams(window.location.search);
    const initialQ = params.get('q');
    const path = window.location.pathname;

    if (initialQ) {
      setSearchSubmittedQuery(initialQ);
      setSearchQuery(initialQ);
      setCurrentTab('search');
    } else if (path.startsWith('/account/')) {
      const sub = path.replace('/account/', '') as AccountSubPage;
      setCurrentTab('account');
      setAccountSubPage(sub);
    } else if (!window.history.state || !window.history.state.tab) {
      window.history.replaceState({ tab: 'home' }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      // 0. Back from Location Page -> close Location Page
      if (isLocationPageOpen) {
        setIsLocationPageOpen(false);
        return;
      }

      // 1. Back from Product Details -> restore previous page scroll
      if (selectedProduct) {
        const lastEntry = navigationHistoryRef.current.pop();
        setSelectedProduct(null);
        const targetKey = lastEntry?.key || (currentTab === 'home' ? `home:${activeCategory}` : currentTab);
        const targetY = lastEntry?.scrollY ?? (scrollPositionsRef.current.get(targetKey) || 0);
        restoreScrollPosition(targetKey, targetY);
        return;
      }

      // 2. Back from Account Sub-Page -> restore previous page scroll
      if (accountSubPage) {
        const lastEntry = navigationHistoryRef.current.pop();
        if (lastEntry && lastEntry.tab === 'home') {
          // Came from Home Bell
          setAccountSubPage(null);
          setCurrentTab('home');
          if (lastEntry.category) setActiveCategory(lastEntry.category);
          restoreScrollPosition(lastEntry.key, lastEntry.scrollY);
        } else {
          // Came from My Account
          setAccountSubPage(null);
          const targetY = lastEntry?.scrollY ?? (scrollPositionsRef.current.get('account') || 0);
          restoreScrollPosition('account', targetY);
        }
        return;
      }

      // 3. Normal History Back
      if (event.state && event.state.tab) {
        const lastEntry = navigationHistoryRef.current.pop();
        setCurrentTab(event.state.tab);
        if (event.state.subPage) {
          setAccountSubPage(event.state.subPage);
        } else {
          setAccountSubPage(null);
        }
        if (event.state.q) {
          setSearchSubmittedQuery(event.state.q);
          setSearchQuery(event.state.q);
        }
        const targetKey = lastEntry?.key || (event.state.tab === 'home' ? `home:${activeCategory}` : event.state.tab);
        const targetY = lastEntry?.scrollY ?? (scrollPositionsRef.current.get(targetKey) || 0);
        restoreScrollPosition(targetKey, targetY);
      } else {
        setCurrentTab('home');
        setAccountSubPage(null);
        const targetY = scrollPositionsRef.current.get(`home:${activeCategory}`) || 0;
        restoreScrollPosition(`home:${activeCategory}`, targetY);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedProduct, accountSubPage, currentTab, activeCategory, restoreScrollPosition, setActiveCategory]);

  // Open Full-screen Product Detail Page and record scroll position & recently viewed product
  const handleOpenProductDetail = useCallback((product: Product) => {
    const currentKey = getCurrentKey();
    const currentY = window.scrollY;
    scrollPositionsRef.current.set(currentKey, currentY);

    navigationHistoryRef.current.push({
      tab: currentTab,
      subPage: accountSubPage,
      category: activeCategory,
      searchQuery: searchSubmittedQuery,
      key: currentKey,
      scrollY: currentY,
    });

    setIsLocationPageOpen(false);
    setSelectedProduct(product);

    // Track recently viewed products in localStorage
    try {
      const saved = localStorage.getItem('gravvy_recently_viewed');
      const existing: string[] = saved ? JSON.parse(saved) : [];
      const updated = [product.id, ...existing.filter((id) => id !== product.id)].slice(0, 20);
      localStorage.setItem('gravvy_recently_viewed', JSON.stringify(updated));
    } catch {}

    window.history.pushState({ tab: currentTab, q: searchSubmittedQuery, productDetailId: product.id, prevKey: currentKey }, '');
    scrollToPosition(0, true);
  }, [getCurrentKey, currentTab, accountSubPage, activeCategory, searchSubmittedQuery]);

  // Close Product Detail Page and restore previous page scroll position
  const handleCloseProductDetail = useCallback(() => {
    const lastEntry = navigationHistoryRef.current.pop();
    setSelectedProduct(null);
    const targetKey = lastEntry?.key || (currentTab === 'home' ? `home:${activeCategory}` : currentTab);
    const targetY = lastEntry?.scrollY ?? (scrollPositionsRef.current.get(targetKey) || 0);
    restoreScrollPosition(targetKey, targetY);
  }, [currentTab, activeCategory, restoreScrollPosition]);

  // Dedicated Search Trigger
  const handleOpenDedicatedSearch = useCallback(() => {
    setIsDedicatedSearchOpen(true);
    setCurrentTab('search');
    scrollToPosition(0, true);
  }, []);

  // Dedicated Search Results Trigger
  const handleOpenSearchResults = useCallback((query: string) => {
    const clean = query.trim();
    if (!clean) return;
    const currentKey = getCurrentKey();
    scrollPositionsRef.current.set(currentKey, window.scrollY);

    setSearchSubmittedQuery(clean);
    setSearchQuery(clean);
    setIsDedicatedSearchOpen(false);
    setSelectedProduct(null);
    setAccountSubPage(null);
    window.history.pushState({ tab: 'search', q: clean }, '', `?q=${encodeURIComponent(clean)}`);
    setCurrentTab('search');
    scrollToPosition(0, true);
  }, [getCurrentKey]);

  // Handle Tab changes from Bottom Navigation, header links, or in-page actions
  const handleNavTabChange = useCallback((tab: MainNavTab) => {
    const currentKey = getCurrentKey();
    scrollPositionsRef.current.set(currentKey, window.scrollY);

    // Unconditionally close Location page, product details, and account subpages so Bottom Nav always takes priority
    setIsLocationPageOpen(false);
    setSelectedProduct(null);
    setAccountSubPage(null);
    if (tab === 'cart') {
      setCheckoutStep('cart');
    }
    if (tab !== currentTab) {
      window.history.pushState({ tab }, '', tab === 'home' ? '/' : undefined);
      setCurrentTab(tab);
    }
    scrollToPosition(0, true);
  }, [getCurrentKey, currentTab]);

  const handleSelectCategory = useCallback((cat: CategoryTab) => {
    setActiveCategory(cat);
  }, [setActiveCategory]);

  // Dedicated Account Sub-Pages Navigation
  const handleNavigateAccountSubPage = (subPage: AccountSubPage) => {
    const currentKey = 'account';
    const currentY = window.scrollY;
    scrollPositionsRef.current.set(currentKey, currentY);

    navigationHistoryRef.current.push({
      tab: 'account',
      subPage: null,
      key: 'account',
      scrollY: currentY,
    });

    setIsLocationPageOpen(false);
    setSelectedProduct(null);
    setAccountSubPage(subPage);
    setCurrentTab('account');
    window.history.pushState({ tab: 'account', subPage }, '', `/account/${subPage}`);
    scrollToPosition(0, true);
  };

  // Open Notifications from Home Bell icon (unifying Home Bell + Account Notifications)
  const handleOpenNotificationsFromHome = () => {
    const currentKey = `home:${activeCategory}`;
    const currentY = window.scrollY;
    scrollPositionsRef.current.set(currentKey, currentY);

    navigationHistoryRef.current.push({
      tab: 'home',
      subPage: null,
      category: activeCategory,
      key: currentKey,
      scrollY: currentY,
    });

    setSelectedProduct(null);
    setCurrentTab('account');
    setAccountSubPage('notifications');
    window.history.pushState({ tab: 'account', subPage: 'notifications', fromHome: true, prevKey: currentKey }, '', '/account/notifications');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Back navigation from any dedicated Account Sub-Page
  const handleBackFromAccountSubPage = () => {
    const lastEntry = navigationHistoryRef.current.pop();
    if (lastEntry && lastEntry.tab === 'home') {
      // User entered from Home Bell
      setAccountSubPage(null);
      setCurrentTab('home');
      if (lastEntry.category) setActiveCategory(lastEntry.category);
      window.history.pushState({ tab: 'home' }, '', '/');
      restoreScrollPosition(lastEntry.key, lastEntry.scrollY);
    } else {
      // User entered from My Account
      setAccountSubPage(null);
      window.history.pushState({ tab: 'account' }, '', '/account');
      const targetY = lastEntry?.scrollY ?? (scrollPositionsRef.current.get('account') || 0);
      restoreScrollPosition('account', targetY);
    }
  };

  // Product mutations for Admin Dashboard
  const handleAddProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleOrderSuccess = (order: Order) => {
    handleNavTabChange('orders');
  };

  // Dedicated Pages vs Global Browsing Experience:
  // Global Header (Search, Location, Categories) appears ONLY on browsing experience (Home, Food, Grocery, Medicine).
  // Dedicated Pages (Product Details, Location, Your Wish, Cart, Orders, Account, Sub-pages) have their own dedicated header.
  const isBrowsingExperience = !selectedProduct && !isLocationPageOpen && currentTab === 'home';

  return (
    <div className="min-h-screen text-stone-100 flex flex-col relative overflow-x-clip bg-transparent">
      {/* Static Viewport-Fixed Background Layer:
          Stays 100% FIXED relative to the mobile phone viewport while content scrolls over it.
          The gradient never moves, translates, or recalculates with page scrolling. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none -z-20 overflow-hidden transform-gpu"
        style={backgroundStyle}
      />

      <CategoryGradientDefs />
      {/* UNI Theme Gemini-Inspired Ambient Viewport Glow */}
      <UniAmbientGlow />

      {/* Global Browsing Header: ONLY visible during browsing, NOT on dedicated pages */}
      {isBrowsingExperience && (
        <Header
          products={products}
          onSelectProduct={(p) => handleOpenProductDetail(p)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSubmitSearch={handleOpenSearchResults}
          onNavigateHome={() => handleNavTabChange('home')}
          onOpenNotifications={handleOpenNotificationsFromHome}
          onOpenDedicatedSearch={handleOpenDedicatedSearch}
          onOpenLocationPage={() => {
            setIsLocationPageOpen(true);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto px-2 xs:px-3 sm:px-6 lg:px-8 pb-28 sm:pb-24 ${
          isBrowsingExperience ? 'pt-2 xs:pt-3 sm:pt-4' : 'pt-0'
        }`}
      >
        <Suspense fallback={<ViewLoadingFallback />}>
          {/* Full-screen dedicated Location Page */}
        {isLocationPageOpen ? (
          <LocationPage
            onBack={() => setIsLocationPageOpen(false)}
            onNavigateToAddresses={() => {
              setIsLocationPageOpen(false);
              handleNavigateAccountSubPage('addresses');
            }}
          />
        ) : selectedProduct ? (
          <ProductDetailPage
            product={selectedProduct}
            allProducts={products}
            onBack={handleCloseProductDetail}
            onSelectProduct={handleOpenProductDetail}
            onProceedToCheckout={() => {
              setSelectedProduct(null);
              setCurrentTab('cart');
              setCheckoutStep('order-summary');
            }}
            onOpenReviewModal={(pId) => setReviewModalProductId(pId)}
          />
        ) : null}

        <div style={{ display: selectedProduct || isLocationPageOpen ? 'none' : 'contents' }}>
          {currentTab === 'search' ? (
            isDedicatedSearchOpen || !searchSubmittedQuery ? (
              <DedicatedSearchPage
                products={products}
                initialQuery={searchQuery}
                onSelectProduct={handleOpenProductDetail}
                onBack={() => {
                  setIsDedicatedSearchOpen(false);
                  handleNavTabChange('home');
                }}
                onSubmitSearch={handleOpenSearchResults}
              />
            ) : (
              <SearchResultsPage
                products={products}
                initialQuery={searchSubmittedQuery || searchQuery || 'Medicine'}
                onSelectProduct={handleOpenProductDetail}
                onBack={() => {
                  setIsDedicatedSearchOpen(true);
                }}
                onSelectCategory={(cat: CategoryTab) => {
                  setActiveCategory(cat);
                  handleNavTabChange('home');
                }}
                onOpenDedicatedSearch={handleOpenDedicatedSearch}
              />
            )
          ) : currentTab === 'wishlist' ? (
            <YourWishView
              allProducts={products}
              onOpenProductDetail={handleOpenProductDetail}
              onContinueShopping={() => handleNavTabChange('home')}
              onNavigateToCart={() => {
                setCheckoutStep('cart');
                handleNavTabChange('cart');
              }}
            />
          ) : currentTab === 'cart' ? (
            /* Dedicated Checkout Flow: Cart -> Order Summary -> Instructions -> Payment -> Confirmation */
            checkoutStep === 'order-summary' ? (
              <OrderSummaryPage
                onBack={() => setCheckoutStep('cart')}
                onContinue={() => setCheckoutStep('delivery-instructions')}
                onNavigateStep={(stepId) => {
                  if (stepId === 'order-summary') setCheckoutStep('order-summary');
                }}
                onChangeAddress={() => {
                  setAddressReturnTarget('order-summary');
                  handleNavigateAccountSubPage('addresses');
                }}
              />
            ) : checkoutStep === 'delivery-instructions' ? (
              <DeliveryInstructionsPage
                onBack={() => setCheckoutStep('order-summary')}
                onContinue={() => setCheckoutStep('payment')}
                onNavigateStep={(stepId) => {
                  if (stepId === 'order-summary') setCheckoutStep('order-summary');
                  if (stepId === 'delivery-instructions') setCheckoutStep('delivery-instructions');
                }}
                instructions={deliveryInstructions}
                setInstructions={setDeliveryInstructions}
              />
            ) : checkoutStep === 'payment' ? (
              <PaymentPage
                onBack={() => setCheckoutStep('delivery-instructions')}
                onNavigateStep={(stepId) => {
                  if (stepId === 'order-summary') setCheckoutStep('order-summary');
                  if (stepId === 'delivery-instructions') setCheckoutStep('delivery-instructions');
                  if (stepId === 'payment') setCheckoutStep('payment');
                }}
                deliveryInstructions={deliveryInstructions}
                onPaymentSuccess={(newOrder) => {
                  setPlacedOrder(newOrder);
                  setCheckoutStep('confirmation');
                }}
              />
            ) : checkoutStep === 'confirmation' && placedOrder ? (
              <OrderConfirmationPage
                order={placedOrder}
                onViewMyOrders={() => {
                  setFocusedOrderIdForOrdersView(placedOrder.id);
                  setCheckoutStep('cart');
                  handleNavTabChange('orders');
                }}
                onContinueShopping={() => {
                  setCheckoutStep('cart');
                  handleNavTabChange('home');
                }}
              />
            ) : (
              <CartPage
                onProceedToCheckout={() => {
                  if (!isAuthenticated) {
                    setIsAuthModalOpen(true);
                    return;
                  }
                  setCheckoutStep('order-summary');
                }}
                onContinueShopping={() => handleNavTabChange('home')}
                onNavigateTab={handleNavTabChange}
                onChangeAddress={() => {
                  setAddressReturnTarget('cart');
                  handleNavigateAccountSubPage('addresses');
                }}
              />
            )
          ) : currentTab === 'orders' ? (
            <OrdersView
              initialOrderId={focusedOrderIdForOrdersView}
              onBack={() => {
                setFocusedOrderIdForOrdersView(null);
                handleNavTabChange('home');
              }}
              onNavigateCart={() => {
                setCheckoutStep('cart');
                handleNavTabChange('cart');
              }}
              onNavigateSupport={() => handleNavigateAccountSubPage('support')}
            />
          ) : currentTab === 'account' ? (
            /* Dedicated Account Views: Sub-pages or Main Hub */
            accountSubPage === 'profile' ? (
              <ProfilePage onBack={handleBackFromAccountSubPage} />
            ) : accountSubPage === 'addresses' ? (
              <SavedAddressesPage
                onBack={() => {
                  if (addressReturnTarget) {
                    const target = addressReturnTarget;
                    setAddressReturnTarget(null);
                    setAccountSubPage(null);
                    setCurrentTab('cart');
                    setCheckoutStep(target);
                  } else {
                    handleBackFromAccountSubPage();
                  }
                }}
                onSelectAddress={(addr) => {
                  if (addressReturnTarget) {
                    const target = addressReturnTarget;
                    setAddressReturnTarget(null);
                    setAccountSubPage(null);
                    setCurrentTab('cart');
                    setCheckoutStep(target);
                  }
                }}
              />
            ) : accountSubPage === 'payments' ? (
              <PaymentMethodsPage onBack={handleBackFromAccountSubPage} />
            ) : accountSubPage === 'notifications' ? (
              <NotificationsPage onBack={handleBackFromAccountSubPage} />
            ) : accountSubPage === 'recently_viewed' ? (
              <RecentlyViewedPage
                allProducts={products}
                onOpenProductDetail={handleOpenProductDetail}
                onContinueShopping={() => handleNavTabChange('home')}
                onBack={handleBackFromAccountSubPage}
              />
            ) : accountSubPage === 'reviews' ? (
              <ReviewsPage onBack={handleBackFromAccountSubPage} />
            ) : accountSubPage === 'help' ? (
              <HelpCenterPage
                onBack={handleBackFromAccountSubPage}
                onNavigateSupport={() => handleNavigateAccountSubPage('support')}
              />
            ) : accountSubPage === 'support' ? (
              <CustomerSupportPage onBack={handleBackFromAccountSubPage} />
            ) : accountSubPage === 'faqs' ? (
              <FaqsPage onBack={handleBackFromAccountSubPage} />
            ) : accountSubPage === 'contact' ? (
              <ContactUsPage onBack={handleBackFromAccountSubPage} />
            ) : accountSubPage === 'privacy' || accountSubPage === 'terms' || accountSubPage === 'about' ? (
              <LegalPage type={accountSubPage} onBack={handleBackFromAccountSubPage} />
            ) : (
              <AccountView
                onNavigateTab={handleNavTabChange}
                onNavigateSubPage={handleNavigateAccountSubPage}
                onOpenTestRunner={() => setIsTestRunnerOpen(true)}
                onBack={() => handleNavTabChange('home')}
              />
            )
          ) : currentTab === 'admin' ? (
            <HomePage
              products={products}
              promotions={HOME_PROMOTIONS}
              onOpenProductDetail={handleOpenProductDetail}
              onSelectCategory={handleSelectCategory}
            />
          ) : (
            /* Marketplace views governed by Category Navigation with Side Slide and Post-Slide Rendering */
            <div className="w-full overflow-hidden">
              <AnimatePresence mode="wait" custom={slideDirection} initial={false}>
                <motion.div
                  key={activeCategory}
                  custom={slideDirection}
                  variants={categorySlideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full will-change-transform"
                  onAnimationComplete={() => {
                    setRenderedCategory(activeCategory);
                  }}
                >
                  {renderedCategory === activeCategory ? (
                    <>
                      {activeCategory === 'home' && (
                        <HomePage
                          products={products}
                          promotions={HOME_PROMOTIONS}
                          onOpenProductDetail={handleOpenProductDetail}
                          onSelectCategory={handleSelectCategory}
                        />
                      )}

                      {activeCategory === 'food' && (
                        <FoodMarketplace
                          products={products}
                          onOpenProductDetail={handleOpenProductDetail}
                        />
                      )}

                      {activeCategory === 'grocery' && (
                        <GroceryMarketplace
                          products={products}
                          onOpenProductDetail={handleOpenProductDetail}
                        />
                      )}

                      {activeCategory === 'medicine' && (
                        <MedicineMarketplace
                          products={products}
                          onOpenProductDetail={handleOpenProductDetail}
                        />
                      )}
                    </>
                  ) : (
                    <CategorySlideSkeleton category={activeCategory} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </Suspense>
      </main>

      {/* Fixed Bottom Navigation (Hidden completely when on Product Details, Dedicated Account Sub-pages, or during active Checkout Flow steps) */}
      {!selectedProduct && !accountSubPage && !(currentTab === 'cart' && checkoutStep !== 'cart') && (
        <BottomNav
          currentTab={currentTab}
          onTabChange={handleNavTabChange}
        />
      )}

      <Suspense fallback={null}>
        {/* Review Submission Form Modal */}
        <ReviewFormModal
          productId={reviewModalProductId}
          isOpen={!!reviewModalProductId}
          onClose={() => setReviewModalProductId(null)}
          onSubmitReview={(newRev) => {
            // Submitted review feedback
          }}
        />

        {/* In-app Automated QA Test Runner Modal */}
        <AutomatedTestRunner
          isOpen={isTestRunnerOpen}
          onClose={() => setIsTestRunnerOpen(false)}
          products={products}
          promotions={HOME_PROMOTIONS}
        />

        {/* Customer Firebase Authentication Modal */}
        <CustomerAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LocationProvider>
        <NotificationProvider>
          <AuthProvider>
            <CartProvider>
              <MainAppContent />
            </CartProvider>
          </AuthProvider>
        </NotificationProvider>
      </LocationProvider>
    </ThemeProvider>
  );
}
