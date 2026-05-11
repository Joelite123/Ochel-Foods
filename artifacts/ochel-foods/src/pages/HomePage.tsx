import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, Star, Truck, Clock, Shield, Heart } from "lucide-react";
import { categories, featuredByCategory, allProducts } from "@/data/menuData";
import ProductCard from "@/components/ui/ProductCard";
import speckleBg from "@assets/O'Chel_Background_1778493177476.png";
import redLogo from "@assets/O'Chel_Logo_Red_Transparent_1778493177439.png";
import heroImg from "@/assets/hero-spread.png";

const testimonials = [
  { name: "Amaka O.", review: "Best pizza in Ile Ife! The Suya Pizza is absolutely incredible — can't get enough of it.", rating: 5 },
  { name: "Tunde B.", review: "O'chel Foods never disappoints. Fast delivery, hot food, and those banana breads are amazing!", rating: 5 },
  { name: "Chidinma A.", review: "The Small Chops pack is perfect for parties. Everyone always asks where I got them from!", rating: 5 },
];

const features = [
  { icon: Truck, title: "Fast Delivery", desc: "Hot food delivered quickly to your door" },
  { icon: Shield, title: "Premium Quality", desc: "Fresh ingredients, bold flavors every time" },
  { icon: Clock, title: "Order Anytime", desc: "Reach us on WhatsApp — we're always ready" },
  { icon: Heart, title: "Made with Love", desc: "Every meal crafted with passion and care" },
];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(featuredByCategory[0].id);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabsSticky, setTabsSticky] = useState(false);
  const featuredSectionRef = useRef<HTMLElement>(null);

  const filteredResults = search
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const el = sectionRefs.current[id];
    if (el) {
      const offset = 130; // header + tabs height
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!featuredSectionRef.current) return;
      const sectionTop = featuredSectionRef.current.getBoundingClientRect().top;
      setTabsSticky(sectionTop <= 70);

      // Update active tab based on scroll position
      let currentId = featuredByCategory[0].id;
      for (const cat of featuredByCategory) {
        const el = sectionRefs.current[cat.id];
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= 160) currentId = cat.id;
        }
      }
      setActiveTab(currentId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section
        className="relative min-h-[88vh] flex items-center overflow-hidden"
        style={{
          backgroundImage: `url(${speckleBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#fff",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-white/10" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img src={redLogo} alt="O'chel Foods" className="h-20 md:h-24 w-auto mb-6" />
            <h1 className="font-chewy text-5xl md:text-7xl text-gray-900 leading-none mb-4">
              Bold Flavors.<br />
              <span className="text-[#E8192C]">Fast Delivery.</span>
            </h1>
            <p className="font-[Montserrat] text-lg text-gray-600 mb-8 max-w-md">
              Irresistible food crafted with passion and delivered hot to your door. Pizza, Burgers, Shawarma, and more — right here in Ile Ife.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/pizza" data-testid="hero-cta-pizza">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold px-8 py-4 rounded-2xl font-[Montserrat] text-base shadow-lg shadow-red-200 transition-colors"
                >
                  Order Pizza
                </motion.button>
              </Link>
              <a
                href="https://wa.me/2349056351651"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="hero-cta-order"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-[#FFB800] hover:bg-[#e5a600] text-black font-bold px-8 py-4 rounded-2xl font-[Montserrat] text-base shadow-lg shadow-yellow-200 transition-colors"
                >
                  Order Now
                </motion.button>
              </a>
            </div>
          </motion.div>

          {/* Hero food image — right column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:flex justify-center"
          >
            <img
              src={heroImg}
              alt="O'chel Foods spread"
              className="w-full max-w-lg rounded-3xl shadow-2xl object-cover aspect-square"
            />
          </motion.div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="font-chewy text-4xl md:text-5xl text-gray-900 mb-2">Our Menu</h2>
            <p className="font-[Montserrat] text-gray-500">Pick your craving and dig in</p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat, idx) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.07 }}
              >
                <Link href={cat.slug} data-testid={`category-card-${cat.id}`}>
                  <motion.div
                    whileHover={{ y: -6, boxShadow: "0 16px 32px rgba(232,25,44,0.15)" }}
                    className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden cursor-pointer group transition-all"
                  >
                    <div className="aspect-square overflow-hidden bg-gray-50">
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-2 text-center">
                      <span className="font-chewy text-sm text-gray-800">{cat.name}</span>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED — with sticky horizontal tab menu */}
      <section
        ref={featuredSectionRef}
        className="pb-14"
        style={{
          backgroundImage: `url(${speckleBg})`,
          backgroundSize: "cover",
          backgroundColor: "#fff",
        }}
      >
        {/* Section title */}
        <div className="pt-14 pb-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-chewy text-4xl md:text-5xl text-gray-900 mb-1">Featured Items</h2>
            <p className="font-[Montserrat] text-gray-500">Customer favorites — tap a category to jump there</p>
          </motion.div>
        </div>

        {/* Sticky horizontal category tabs */}
        <div
          ref={tabsRef}
          className={`${tabsSticky ? "sticky top-[70px] z-40" : ""} bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1.5 overflow-x-auto py-3 scrollbar-hide">
              {featuredByCategory.map((cat) => (
                <button
                  key={cat.id}
                  data-testid={`featured-tab-${cat.id}`}
                  onClick={() => scrollToSection(cat.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold font-[Montserrat] transition-all whitespace-nowrap ${
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

        {/* Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto my-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-featured"
                placeholder="Search our menu..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-[#E8192C] focus:outline-none font-[Montserrat] text-sm shadow-sm bg-white"
              />
            </div>
          </div>

          {/* Search results */}
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
            /* Category sections */
            <div className="space-y-14">
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

      {/* WHY O'CHEL */}
      <section className="py-14 bg-[#E8192C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-chewy text-4xl md:text-5xl text-white mb-2">Why O'chel?</h2>
            <p className="font-[Montserrat] text-white/80">Because great food deserves great service</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, idx) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center hover:bg-white/20 transition-colors"
              >
                <div className="w-12 h-12 bg-[#FFB800] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feat.icon className="w-6 h-6 text-black" />
                </div>
                <h3 className="font-chewy text-xl text-white mb-1">{feat.title}</h3>
                <p className="text-white/70 text-sm font-[Montserrat]">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        className="py-14"
        style={{
          backgroundImage: `url(${speckleBg})`,
          backgroundSize: "cover",
          backgroundColor: "#fff",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-chewy text-4xl md:text-5xl text-gray-900 mb-2">What People Say</h2>
            <p className="font-[Montserrat] text-gray-500">Real reviews from real customers</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-md border border-gray-100"
                data-testid={`testimonial-${idx}`}
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#FFB800] text-[#FFB800]" />
                  ))}
                </div>
                <p className="text-gray-600 font-[Montserrat] text-sm leading-relaxed mb-4">"{t.review}"</p>
                <p className="font-chewy text-[#E8192C] text-base">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DELIVERY STRIP */}
      <section className="bg-[#1a1a1a] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <h3 className="font-chewy text-2xl text-[#FFB800] mb-1">Ready to Order?</h3>
              <p className="font-[Montserrat] text-white/70 text-sm">
                Reach us on WhatsApp — we're serving Ile Ife and surrounding areas
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://wa.me/2349056351651"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-order-now-strip"
                className="bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold px-6 py-3 rounded-xl font-[Montserrat] text-sm transition-colors"
              >
                Order Now
              </a>
              <a
                href="https://instagram.com/Ochel_ng"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-instagram-strip"
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl font-[Montserrat] text-sm transition-colors"
              >
                @Ochel_ng
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
