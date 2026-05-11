import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartPanel from "@/components/ui/CartPanel";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import PizzaPage from "@/pages/PizzaPage";
import BurgersPage from "@/pages/BurgersPage";
import ShawarmaPage from "@/pages/ShawarmaPage";
import FingerFoodsPage from "@/pages/FingerFoodsPage";
import PastriesPage from "@/pages/PastriesPage";
import BakedGoodiesPage from "@/pages/BakedGoodiesPage";
import AboutPage from "@/pages/AboutPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/pizza" component={PizzaPage} />
          <Route path="/burgers" component={BurgersPage} />
          <Route path="/shawarma" component={ShawarmaPage} />
          <Route path="/finger-foods" component={FingerFoodsPage} />
          <Route path="/pastries" component={PastriesPage} />
          <Route path="/baked-goodies" component={BakedGoodiesPage} />
          <Route path="/about" component={AboutPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <CartPanel />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
