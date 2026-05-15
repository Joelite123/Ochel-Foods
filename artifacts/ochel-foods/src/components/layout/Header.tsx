import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import whiteLogo from "@assets/O'Chel_Logo_White_transparent_1778493177551.png";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Pizza", href: "/pizza" },
  { label: "Burgers", href: "/burgers" },
  { label: "Shawarma", href: "/shawarma" },
  { label: "Finger Foods", href: "/finger-foods" },
  { label: "Pastries", href: "/pastries" },
  { label: "Baked Goodies", href: "/baked-goodies" },
  { label: "About", href: "/about" },
];

export default function Header() {
  const [location] = useLocation();
  const { items, setIsCartOpen } = useCart();
  const { user, profile, signOut, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#E8192C] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-[70px]">
            <Link href="/" data-testid="link-home-logo">
              <img
                src={whiteLogo}
                alt="O'chel Foods"
                className="h-10 md:h-12 w-auto object-contain cursor-pointer"
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-all font-[Montserrat] ${
                    location === link.href
                      ? "bg-white text-[#E8192C]"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {/* Cart button */}
              <button
                onClick={() => setIsCartOpen(true)}
                data-testid="button-open-cart"
                className="relative p-2 text-white hover:bg-white/20 rounded-full transition-all"
                aria-label="Open cart"
              >
                <ShoppingBag className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FFB800] text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" data-testid="cart-badge">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Auth button — desktop */}
              <div className="hidden lg:block relative">
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-all font-[Montserrat] text-sm font-semibold"
                    >
                      <User className="w-4 h-4" />
                      <span className="max-w-[100px] truncate">{profile?.full_name?.split(" ")[0] || "Account"}</span>
                    </button>
                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 font-[Montserrat]">
                          <Link href="/account" onClick={() => setUserMenuOpen(false)}>
                            <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                              <User className="w-4 h-4 text-gray-400" />
                              My Account
                            </div>
                          </Link>
                          {isAdmin && (
                            <Link href="/admin" onClick={() => setUserMenuOpen(false)}>
                              <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                                <LayoutDashboard className="w-4 h-4 text-gray-400" />
                                Admin Dashboard
                              </div>
                            </Link>
                          )}
                          <hr className="my-1 border-gray-100" />
                          <button
                            onClick={() => { signOut(); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <Link href="/login">
                    <button className="flex items-center gap-1.5 bg-white text-[#E8192C] hover:bg-white/90 px-3 py-1.5 rounded-full transition-all font-[Montserrat] text-sm font-bold">
                      <User className="w-4 h-4" />
                      Sign In
                    </button>
                  </Link>
                )}
              </div>

              <button
                className="lg:hidden p-2 text-white hover:bg-white/20 rounded-md"
                onClick={() => setMobileOpen(true)}
                data-testid="button-mobile-menu"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-72 bg-[#E8192C] shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <img src={whiteLogo} alt="O'chel Foods" className="h-10 w-auto" />
              <button
                onClick={() => setMobileOpen(false)}
                data-testid="button-close-mobile-menu"
                className="p-2 text-white hover:bg-white/20 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  data-testid={`mobile-nav-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-lg text-base font-semibold transition-all font-[Montserrat] ${
                    location === link.href
                      ? "bg-white text-[#E8192C]"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-white/20 my-2" />
              {user ? (
                <>
                  <Link href="/account" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-base font-semibold text-white hover:bg-white/20 font-[Montserrat]">
                    <User className="w-5 h-5" /> My Account
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg text-base font-semibold text-white hover:bg-white/20 font-[Montserrat]">
                      <LayoutDashboard className="w-5 h-5" /> Admin
                    </Link>
                  )}
                  <button onClick={() => { signOut(); setMobileOpen(false); }}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-base font-semibold text-white/80 hover:bg-white/20 font-[Montserrat]">
                    <LogOut className="w-5 h-5" /> Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-base font-semibold bg-white text-[#E8192C] font-[Montserrat]">
                  <User className="w-5 h-5" /> Sign In / Register
                </Link>
              )}
            </nav>
            <div className="p-4 border-t border-white/20">
              <p className="text-white/70 text-xs text-center font-[Montserrat]">+234 905 635 1651 | @Ochel_ng</p>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed header */}
      <div className="h-16 md:h-[70px]" />
    </>
  );
}
