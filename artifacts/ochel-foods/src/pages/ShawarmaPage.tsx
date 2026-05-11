import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { shawarmaProducts } from "@/data/menuData";
import ProductCard from "@/components/ui/ProductCard";
import CategoryNav from "@/components/layout/CategoryNav";
import speckleBg from "@assets/O'Chel_Background_1778493177476.png";

export default function ShawarmaPage() {
  const [search, setSearch] = useState("");

  const filtered = search
    ? shawarmaProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase()) ||
          (p.ingredients || []).some((ing) => ing.toLowerCase().includes(search.toLowerCase()))
      )
    : shawarmaProducts;

  return (
    <div className="min-h-screen">
      <section
        className="py-14 text-center relative"
        style={{ backgroundImage: `url(${speckleBg})`, backgroundSize: "cover", backgroundColor: "#c8b000" }}
      >
        <div className="absolute inset-0 bg-[#FFB800]/90" />
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="font-[Montserrat] text-black/60 text-sm uppercase tracking-widest">Our Menu</span>
            <h1 className="font-chewy text-5xl md:text-6xl text-black mt-1 mb-3">Shawarma</h1>
            <p className="font-[Montserrat] text-black/70 max-w-md mx-auto text-sm">
              Wrapped, rolled, and packed with savory flavor. Our shawarma is irresistibly good.
            </p>
          </motion.div>
        </div>
      </section>

      <CategoryNav current="/shawarma" />

      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-shawarma"
                placeholder="Search shawarma or ingredients..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-[#E8192C] focus:outline-none font-[Montserrat] text-sm shadow-sm"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-chewy text-2xl text-gray-400">No items found for "{search}"</p>
              <button onClick={() => setSearch("")} className="mt-4 text-[#E8192C] font-semibold font-[Montserrat] hover:underline">Clear</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
