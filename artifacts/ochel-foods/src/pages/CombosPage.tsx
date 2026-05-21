import { motion } from "framer-motion";
import { comboDealProducts, formatPrice } from "@/data/menuData";
import ComboCard from "@/components/ui/ComboCard";

export default function CombosPage() {
  const totalSavings = comboDealProducts.reduce(
    (sum, c) => sum + (c.originalPrice - c.comboPrice),
    0
  );

  return (
    <div className="min-h-screen">
      {/* Header banner */}
      <div className="bg-[#E8192C] py-12 px-4 text-center">
        <p className="text-white/80 font-[Montserrat] text-sm uppercase tracking-widest mb-2">Special Offers</p>
        <h1 className="font-chewy text-5xl md:text-6xl text-white mb-3">Special Offers</h1>
        <p className="text-white/80 font-[Montserrat] text-base max-w-md mx-auto">
          Bundled favourites at unbeatable prices. More food, less spend.
        </p>
      </div>

      {/* Savings banner */}
      <div className="bg-green-600 py-2.5 px-4 text-center">
        <p className="text-white font-[Montserrat] text-sm font-semibold">
          Save up to {formatPrice(Math.max(...comboDealProducts.map(c => c.originalPrice - c.comboPrice)))} on a single order · All combos include free selection
        </p>
      </div>

      {/* Combo list */}
      <section className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <div className="flex flex-col gap-5">
          {comboDealProducts.map((combo, idx) => (
            <motion.div
              key={combo.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <ComboCard combo={combo} />
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-gray-400 font-[Montserrat] text-xs mt-10">
          Combo prices apply at checkout. All items subject to availability.
        </p>
      </section>
    </div>
  );
}
