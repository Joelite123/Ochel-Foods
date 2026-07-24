import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Gift,
  MapPin, Tag, Clock, Mail, BarChart2, Menu, X, LogOut, ChevronRight, Layers,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import whiteLogo from "@assets/O'Chel_Logo_White_transparent_1778493177551.png";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, tip: "Sales & order summary" },
  { href: "/admin/products", label: "Products", icon: Package, tip: "Add, edit, remove menu items" },
  { href: "/admin/combos", label: "Special Offers", icon: Layers, tip: "Manage combo deals & bundle offers" },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, tip: "View & update order status" },
  { href: "/admin/customers", label: "Customers", icon: Users, tip: "Customer list & details" },
  { href: "/admin/referrals", label: "Referrals & Loyalty", icon: Gift, tip: "Manage rewards & referrals" },
  { href: "/admin/delivery", label: "Delivery Settings", icon: MapPin, tip: "Zones & delivery fees" },
  { href: "/admin/promotions", label: "Promotions", icon: Tag, tip: "Promo codes & banners" },
  { href: "/admin/hours", label: "Operating Hours", icon: Clock, tip: "Set daily hours & holidays" },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail, tip: "Subscribers & email campaigns" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2, tip: "Sales charts & reports" },
];

type Props = { children: ReactNode };

export default function AdminLayout({ children }: Props) {
  const [location] = useLocation();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { unreadCount } = useNotifications();

  // Reset unread badge when navigating to orders page
  useEffect(() => {
    // The AdminOrders component calls markAllRead on mount
  }, [location]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1a1a1a] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <Link href="/">
            <img src={whiteLogo} alt="O'chel Foods" className="h-9 w-auto" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 py-2">
          <p className="text-white/40 text-xs font-[Montserrat] uppercase tracking-wider px-3 mb-2">
            Admin Panel
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, tip }) => {
            const active = location === href || (href !== "/admin" && location.startsWith(href));
            const isOrders = href === "/admin/orders";
            const showBadge = isOrders && unreadCount > 0 && location !== href;

            return (
              <Link key={href} href={href}>
                <div
                  onClick={() => setSidebarOpen(false)}
                  title={tip}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${
                    active
                      ? "bg-[#E8192C] text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-[Montserrat] font-medium flex-1">{label}</span>
                  {showBadge && (
                    <span className="ml-auto bg-[#E8192C] text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {active && !showBadge && (
                    <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold font-[Montserrat] truncate">
                {profile?.full_name || profile?.email}
              </p>
              <p className="text-white/40 text-xs font-[Montserrat]">Administrator</p>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="text-white/40 hover:text-red-400 transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-chewy text-xl text-gray-900">
              {navItems.find((n) => location === n.href || (n.href !== "/admin" && location.startsWith(n.href)))?.label ?? "Admin"}
            </h1>
            <p className="text-gray-400 text-xs font-[Montserrat]">
              {navItems.find((n) => location === n.href || (n.href !== "/admin" && location.startsWith(n.href)))?.tip ?? ""}
            </p>
          </div>
          {/* Notification indicator in top bar for mobile */}
          {unreadCount > 0 && location !== "/admin/orders" && (
            <Link href="/admin/orders">
              <div className="flex items-center gap-1.5 bg-[#E8192C] text-white text-xs font-bold font-[Montserrat] px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-[#c8151f] transition-colors">
                <ShoppingBag className="w-3.5 h-3.5" />
                {unreadCount} new order{unreadCount !== 1 ? "s" : ""}
              </div>
            </Link>
          )}
          <Link href="/">
            <span className="text-sm text-[#E8192C] font-[Montserrat] font-semibold hover:underline hidden sm:block">
              ← View Site
            </span>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
