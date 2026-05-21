import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { categories, featuredByCategory, allProducts, comboDealProducts } from "@/data/menuData";
import ProductCard from "@/components/ui/ProductCard";
import ComboCard from "@/components/ui/ComboCard";
import PromoBanner from "@/components/ui/PromoBanner";
import speckleBg from "@assets/O'Chel_Background_1778493177476.png";
import pizzaImg from "@/assets/pizza.png";
import burgerImg from "@/assets/burger.png";
import shawarmaImg from "@/assets/shawarma.png";
import fingerFoodsImg from "@/assets/finger-foods.png";
import pastriesImg from "@/assets/pastries.png";
import donutsImg from "@/assets/donuts.png";
import bananaBreadImg from "@/assets/banana-bread.png";
import heroImg from "@/assets/hero-spread.png";

const slides = [
  { img: heroImg,        label: "Full Spread",          sub: "Something for everyone" },
  { img: pizzaImg,       label: "Pizza Combos",         sub: "Choose your slice, your way" },
  { img: burgerImg,      label: "Burger & Wrap Deals",  sub: "Stack it up, sauce it right" },
  { img: shawarmaImg,    label: "Shawarma Specials",    sub: "Loaded, fresh, delivered hot" },
  { img: fingerFoodsImg, label: "Finger Foods & Chops", sub: "Perfect for parties & snacking" },
  { img: pastriesImg,    label: "Pastries",             sub: "Flaky, golden, freshly made" },
  { img: donutsImg,      label: "Donuts",               sub: "Sweet treats any time of day" },
  { img: bananaBreadImg, label: "Baked Goodies",        sub: "Wholesome bakes, bold flavors" },
];

export default function HomePage() {
  const COMBO_TAB_ID = "featured-combos";

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(COMBO_TAB_ID);
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredResults = search
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const goTo = (idx: number, dir: number) => {
    setDirection(dir);
    setSlide((idx + slides.length) % slides.length);
  };

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const el = sectionRefs.current[id];
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setSlide((s) => (s + 1) % slides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      let currentId = COMBO_TAB_ID;
      const allTabs = [COMBO_TAB_ID, ...featuredByCategory.map((c) => c.id)];
      for (const id of allTabs) {
        const el = sectionRefs.current[id];
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= 140) currentId = id;
        }
      }
      setActiveTab(currentId);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div className="min-h-screen">

      {/* ── PROMO BANNERS ──────────────────────────────────────── */}
      <PromoBanner />

      {/* ── STICKY CATEGORY NAV ─────────────────────────────────── */}
      <div className="sticky top-[62px] z-40 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-hide">
            {/* Special Offers tab — first */}
            <button
              data-testid="featured-tab-combos"
              onClick={() => scrollToSection(COMBO_TAB_ID)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold font-[Montserrat] transition-all whitespace-nowrap ${
                activeTab === COMBO_TAB_ID
                  ? "bg-[#E8192C] text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🔥 Special Offers
            </button>
            {featuredByCategory.map((cat) => (
              <button
                key={cat.id}
                data-testid={`featured-tab-${cat.id}`}
                onClick={() => scrollToSection(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold font-[Montserrat] transition-all whitespace-nowrap ${
                  activeTab === cat.id
                    ? "bg-[#E8192C] text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── FLASHCARD CAROUSEL ──────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-black" style={{ height: "clamp(220px, 45vw, 520px)" }}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={slide}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <img
              src={slides[slide].img}
              alt={slides[slide].label}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-chewy text-2xl md:text-4xl text-white leading-tight"
              >
                {slides[slide].label}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-[Montserrat] text-white/80 text-sm md:text-base mt-1"
              >
                {slides[slide].sub}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next arrows */}
        <button
          onClick={() => goTo(slide - 1, -1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => goTo(slide + 1, 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > slide ? 1 : -1)}
              className={`rounded-full transition-all ${
                i === slide ? "bg-white w-5 h-2" : "bg-white/50 w-2 h-2"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ── ORDER BUTTONS + SEARCH ──────────────────────────────── */}
      <div
        className="py-5 px-4"
        style={{ backgroundImage: `url(${speckleBg})`, backgroundSize: "cover", backgroundColor: "#fff" }}
      >
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          {/* Buttons row */}
          <div className="flex flex-wrap justify-center gap-3 w-full">
            <Link href="/pizza" data-testid="hero-cta-pizza">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold px-8 py-3.5 rounded-2xl font-[Montserrat] text-base shadow-md shadow-red-200 transition-colors"
              >
                Order Pizza
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => scrollToSection(featuredByCategory[0].id)}
              data-testid="hero-cta-menu"
              className="bg-[#FFB800] hover:bg-[#e5a600] text-black font-bold px-8 py-3.5 rounded-2xl font-[Montserrat] text-base shadow-md shadow-yellow-200 transition-colors"
            >
              View Menu
            </motion.button>
          </div>

          {/* Search */}
          <div className="w-full">
            {searchOpen ? (
              <motion.div
                initial={{ opacity: 0, scaleY: 0.8 }}
                animate={{ opacity: 1, scaleY: 1 }}
                className="relative"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-featured"
                  placeholder="Search our menu..."
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 border-[#E8192C] focus:outline-none font-[Montserrat] text-sm shadow-sm bg-white"
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearch(""); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
                  aria-label="Close search"
                >
                  ×
                </button>
              </motion.div>
            ) : (
              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-[#E8192C] text-gray-500 hover:text-[#E8192C] font-[Montserrat] font-semibold px-7 py-3 rounded-2xl shadow-sm transition-all text-sm"
                >
                  <Search className="w-4 h-4" />
                  Search the menu
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MENU SECTIONS ───────────────────────────────────────── */}
      <section
        className="pb-14 pt-6"
        style={{ backgroundImage: `url(${speckleBg})`, backgroundSize: "cover", backgroundColor: "#fff" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Search results overlay */}
          {search && filteredResults ? (
            filteredResults.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-chewy text-2xl text-gray-400">No items found for "{search}"</p>
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 text-[#E8192C] font-semibold font-[Montserrat] hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredResults.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-14">

              {/* ── COMBO DEALS ──────────────────────────────────────── */}
              <div
                id={COMBO_TAB_ID}
                ref={(el) => { sectionRefs.current[COMBO_TAB_ID] = el; }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-chewy text-3xl text-gray-900">🔥 Special Offers</h3>
                  <Link
                    href="/combos"
                    className="text-[#E8192C] font-semibold font-[Montserrat] text-sm hover:underline"
                  >
                    See all →
                  </Link>
                </div>
                {/* Savings callout */}
                <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <p className="text-green-800 font-[Montserrat] text-sm font-semibold">
                    Bundle & save — combo prices beat ordering items separately. Savings shown on each deal.
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {comboDealProducts.map((combo, idx) => (
                    <motion.div
                      key={combo.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.08 }}
                    >
                      <ComboCard combo={combo} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* ── REGULAR MENU CATEGORIES ──────────────────────────── */}
              {featuredByCategory.map((cat) => (
                <div
                  key={cat.id}
                  id={cat.id}
                  ref={(el) => { sectionRefs.current[cat.id] = el; }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-chewy text-3xl text-gray-900">{cat.label}</h3>
                    <Link
                      href={categories.find((c) => c.name.split(" ")[0] === cat.label.split(" ")[0])?.slug || "/"}
                      className="text-[#E8192C] font-semibold font-[Montserrat] text-sm hover:underline"
                      data-testid={`link-see-all-${cat.id}`}
                    >
                      See all →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {cat.products.map((product, idx) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.08 }}
                      >
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── NEWSLETTER SUBSCRIBE ──────────────────────────────── */}
      <NewsletterSection />
    </div>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return toast.error("Enter a valid email");
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/subscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (res.ok) {
        setDone(true);
        toast.success("You're subscribed! 🎉");
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <section className="bg-[#1a1a1a] py-12 px-4">
      <div className="max-w-xl mx-auto text-center">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 bg-[#E8192C]/20 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-[#E8192C]" />
          </div>
        </div>
        <h2 className="font-chewy text-3xl text-white mb-2">Stay in the loop</h2>
        <p className="text-white/60 font-[Montserrat] text-sm mb-6">
          Get exclusive deals, new menu launches, and promo codes straight to your inbox.
        </p>
        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-2xl px-6 py-4 font-[Montserrat] font-semibold"
          >
            ✅ You're on the list! Watch out for goodies.
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text" placeholder="Your name (optional)" value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-white/10 border border-white/20 focus:border-[#E8192C] text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm font-[Montserrat] focus:outline-none"
            />
            <input
              type="email" placeholder="Email address" value={email} required
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-white/10 border border-white/20 focus:border-[#E8192C] text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm font-[Montserrat] focus:outline-none"
            />
            <button
              type="submit" disabled={submitting}
              className="bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold px-6 py-3 rounded-xl font-[Montserrat] transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {submitting ? "…" : "Subscribe"}
            </button>
          </form>
        )}
        <p className="text-white/30 text-xs font-[Montserrat] mt-3">No spam. Unsubscribe any time.</p>
      </div>
    </section>
  );
}
