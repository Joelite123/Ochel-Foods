import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { comboDealProducts, formatPrice } from "@/data/menuData";
import type { ComboProduct } from "@/data/menuData";
import ComboCard from "@/components/ui/ComboCard";
import { supabase } from "@/lib/supabase";
import type { DBCombo } from "@/lib/supabase";

function dbToCombo(c: DBCombo): ComboProduct {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    imageUrl: c.image_url,
    comboPrice: c.combo_price,
    originalPrice: c.original_price,
    includes: c.includes,
    tag: c.tag ?? undefined,
  };
}

export default function CombosPage() {
  const [combos, setCombos] = useState<ComboProduct[]>(comboDealProducts);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("combos")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCombos((data as DBCombo[]).map(dbToCombo));
        }
        setLoaded(true);
      });
  }, []);

  const totalSavings = combos.reduce(
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
        {loaded && totalSavings > 0 && (
          <p className="mt-3 inline-block bg-white/15 text-white font-[Montserrat] text-sm font-semibold px-4 py-1.5 rounded-full">
            Up to {formatPrice(Math.max(...combos.map(c => c.originalPrice - c.comboPrice)))} saved per combo!
          </p>
        )}
      </div>

      {/* Combo list */}
      <section className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        {!loaded && combos.length === 0 ? (
          <div className="text-center py-16 text-gray-400 font-[Montserrat]">Loading offers…</div>
        ) : (
          <div className="flex flex-col gap-5">
            {combos.map((combo, idx) => (
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
        )}

        {/* Bottom note */}
        <p className="text-center text-gray-400 font-[Montserrat] text-xs mt-10">
          Combo prices apply at checkout. All items subject to availability.
        </p>
      </section>
    </div>
  );
}
