import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RewardProvider } from "@/contexts/RewardContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartPanel from "@/components/ui/CartPanel";
import FloatingWhatsApp from "@/components/ui/FloatingWhatsApp";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import PizzaPage from "@/pages/PizzaPage";
import BurgersPage from "@/pages/BurgersPage";
import FingerFoodsPage from "@/pages/FingerFoodsPage";
import DrinksPage from "@/pages/DrinksPage";
import PastriesPage from "@/pages/PastriesPage";
import BakedGoodiesPage from "@/pages/BakedGoodiesPage";
import CombosPage from "@/pages/CombosPage";
import AboutPage from "@/pages/AboutPage";
import LoginPage from "@/pages/LoginPage";
import AccountPage from "@/pages/AccountPage";
import PrintStation from "@/pages/PrintStation";

// Admin pages
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminReferrals from "@/pages/admin/AdminReferrals";
import AdminDelivery from "@/pages/admin/AdminDelivery";
import AdminPromotions from "@/pages/admin/AdminPromotions";
import AdminHours from "@/pages/admin/AdminHours";
import AdminNewsletter from "@/pages/admin/AdminNewsletter";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";

const queryClient = new QueryClient();

/** Wrap admin pages — redirects to login if not admin */
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location)}`);
    } else if (profile && profile.role !== "admin") {
      navigate("/");
    }
  }, [isLoading, user, profile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#E8192C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  if (profile && profile.role !== "admin") return null;

  return <>{children}</>;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (sessionStorage.getItem("visit_tracked")) return;
    sessionStorage.setItem("visit_tracked", "1");
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.from("site_visits").insert({ visited_at: new Date().toISOString() }).then(() => {});
    });
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartPanel />
      <FloatingWhatsApp />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* ── Admin routes ── */}
      <Route path="/admin">
        {() => (
          <AdminGuard>
            <AdminLayout><AdminOverview /></AdminLayout>
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/products">
        {() => (
          <AdminGuard>
            <AdminLayout><AdminProducts /></AdminLayout>
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/orders">
        {() => (
          <AdminGuard>
            <AdminLayout><AdminOrders /></AdminLayout>
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/customers">
        {() => (
          <AdminGuard>
            <AdminLayout><AdminCustomers /></AdminLayout>
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/referrals">
        {() => (
          <AdminGuard>
            <AdminLayout><AdminReferrals /></AdminLayout>
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/delivery">
        {() => (
          <AdminGuard>
            <AdminLayout><AdminDelivery /></AdminLayout>
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/promotions">
        {() => (
          <AdminGuard>
            <AdminLayout><AdminPromotions /></AdminLayout>
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/hours">
        {() => (
          <AdminGuard>
            <AdminLayout><AdminHours /></AdminLayout>
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/newsletter">
        {() => (
          <AdminGuard>
            <AdminLayout><AdminNewsletter /></AdminLayout>
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/analytics">
        {() => (
          <AdminGuard>
            <AdminLayout><AdminAnalytics /></AdminLayout>
          </AdminGuard>
        )}
      </Route>

      {/* ── Auth pages (no header/footer) ── */}
      <Route path="/login" component={LoginPage} />

      {/* ── Internal tools (no header/footer) ── */}
      <Route path="/print-station" component={PrintStation} />

      {/* ── Public routes ── */}
      <Route path="/">
        {() => <PublicLayout><HomePage /></PublicLayout>}
      </Route>
      <Route path="/pizza">
        {() => <PublicLayout><PizzaPage /></PublicLayout>}
      </Route>
      <Route path="/burgers">
        {() => <PublicLayout><BurgersPage /></PublicLayout>}
      </Route>
      <Route path="/shawarma">
        {() => <PublicLayout><BurgersPage /></PublicLayout>}
      </Route>
      <Route path="/finger-foods">
        {() => <PublicLayout><FingerFoodsPage /></PublicLayout>}
      </Route>
      <Route path="/drinks">
        {() => <PublicLayout><DrinksPage /></PublicLayout>}
      </Route>
      <Route path="/pastries">
        {() => <PublicLayout><PastriesPage /></PublicLayout>}
      </Route>
      <Route path="/baked-goodies">
        {() => <PublicLayout><BakedGoodiesPage /></PublicLayout>}
      </Route>
      <Route path="/combos">
        {() => <PublicLayout><CombosPage /></PublicLayout>}
      </Route>
      <Route path="/about">
        {() => <PublicLayout><AboutPage /></PublicLayout>}
      </Route>
      <Route path="/account">
        {() => <PublicLayout><AccountPage /></PublicLayout>}
      </Route>

      <Route>
        {() => <PublicLayout><NotFound /></PublicLayout>}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RewardProvider>
          <CartProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
              <SonnerToaster position="top-center" richColors />
            </TooltipProvider>
          </CartProvider>
        </RewardProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
