import { useState, useEffect } from "react";
import { X, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, DBPromotion } from "@/lib/supabase";

export default function PromoBanner() {
  const [banners, setBanners] = useState<DBPromotion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem("dismissed-banners");
    if (stored) setDismissed(new Set(JSON.parse(stored)));

    supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .not("banner_url", "is", null)
      .then(({ data }) => {
        if (data) {
          const now = new Date();
          const active = (data as DBPromotion[]).filter((p) => {
            if (p.starts_at && new Date(p.starts_at) > now) return false;
            if (p.ends_at && new Date(p.ends_at) < now) return false;
            return true;
          });
          setBanners(active);
        }
      });
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    localStorage.setItem("dismissed-banners", JSON.stringify([...next]));
  };

  const visible = banners.filter((b) => !dismissed.has(b.id));

  return (
    <AnimatePresence>
      {visible.map((banner) => (
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden"
        >
          {banner.banner_url ? (
            <div className="relative">
              <img
                src={banner.banner_url}
                alt={banner.title}
                className="w-full max-h-48 object-cover"
              />
              <button
                onClick={() => dismiss(banner.id)}
                className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              {banner.code && (
                <div className="absolute bottom-2 left-2 bg-[#E8192C] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-bold font-[Montserrat]">
                  <Tag className="w-3.5 h-3.5" />
                  Use code: <span className="tracking-widest">{banner.code}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-[#E8192C] to-[#FF6B35] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold font-[Montserrat] text-sm">
                  {banner.title}
                  {banner.code && (
                    <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs tracking-widest">
                      {banner.code}
                    </span>
                  )}
                </span>
              </div>
              <button onClick={() => dismiss(banner.id)} className="text-white/80 hover:text-white ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
