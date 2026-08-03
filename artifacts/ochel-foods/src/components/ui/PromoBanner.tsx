import { useState, useEffect, useCallback } from "react";
import { X, Tag, ChevronLeft, ChevronRight, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { DBPromotion } from "@/lib/supabase";
import { getActivePromos } from "@/lib/promosCache";

const SLIDE_INTERVAL = 5000;

export default function PromoBanner() {
  const [banners, setBanners] = useState<DBPromotion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("dismissed-banners");
    if (stored) setDismissed(new Set(JSON.parse(stored)));

    getActivePromos().then((promos) => {
      setBanners(promos.filter((p) => !!p.banner_url));
    });
  }, []);

  const visible = banners.filter((b) => !dismissed.has(b.id));

  const goTo = useCallback((index: number, dir: number) => {
    setDirection(dir);
    setCurrent(index);
  }, []);

  const next = useCallback(() => {
    if (visible.length < 2) return;
    goTo((current + 1) % visible.length, 1);
  }, [current, visible.length, goTo]);

  const prev = useCallback(() => {
    if (visible.length < 2) return;
    goTo((current - 1 + visible.length) % visible.length, -1);
  }, [current, visible.length, goTo]);

  // Auto-advance
  useEffect(() => {
    if (paused || visible.length < 2) return;
    const timer = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, visible.length, next]);

  // Keep current in bounds after a dismiss
  useEffect(() => {
    if (visible.length > 0 && current >= visible.length) {
      setCurrent(visible.length - 1);
    }
  }, [visible.length, current]);

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    localStorage.setItem("dismissed-banners", JSON.stringify([...next]));
  };

  if (visible.length === 0) return null;

  const banner = visible[current];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  const isImage = !!banner.banner_url;

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={banner.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          {isImage ? (
            <div className="relative">
              <img
                src={banner.banner_url!}
                alt={banner.title}
                className="w-full max-h-52 object-cover"
              />
              {/* Gradient overlay for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Promo code chip */}
              {banner.code && (
                <div className="absolute bottom-8 left-3 bg-[#E8192C] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-bold font-[Montserrat] shadow-lg">
                  <Tag className="w-3.5 h-3.5" />
                  Use code: <span className="tracking-widest">{banner.code}</span>
                </div>
              )}

              {/* Free product chip */}
              {banner.discount_type === "free_product" && banner.free_product_name && !banner.code && (
                <div className="absolute bottom-8 left-3 bg-green-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-bold font-[Montserrat] shadow-lg">
                  <Gift className="w-3.5 h-3.5" />
                  Free: {banner.free_product_name}
                </div>
              )}

              {/* Dismiss */}
              <button
                onClick={() => dismiss(banner.id)}
                className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-[#E8192C] to-[#FF6B35] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {banner.discount_type === "free_product"
                  ? <Gift className="w-4 h-4 flex-shrink-0" />
                  : <Tag className="w-4 h-4 flex-shrink-0" />}
                <span className="font-semibold font-[Montserrat] text-sm">
                  {banner.title}
                  {banner.code && (
                    <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs tracking-widest">
                      {banner.code}
                    </span>
                  )}
                </span>
              </div>
              <button onClick={() => dismiss(banner.id)} className="text-white/80 hover:text-white ml-2 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Carousel controls — only when multiple banners */}
      {visible.length > 1 && (
        <>
          {/* Prev / Next arrows */}
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1 transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1 transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {visible.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > current ? 1 : -1)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "bg-white w-5 h-2"
                    : "bg-white/50 w-2 h-2 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
