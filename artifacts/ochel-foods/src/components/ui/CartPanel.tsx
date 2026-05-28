import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { DBPromotion } from "@/lib/supabase";
import { apiUrl } from "@/lib/api";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ChevronDown,
  Clock, Info, Wallet, Tag, Check, X, MapPin, Bike, Store, Ticket,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRewards } from "@/contexts/RewardContext";
import { DELIVERY_ZONES, drinkProducts, formatPrice } from "@/data/menuData";
import { toast } from "sonner";

/* ─── Delivery time helpers (now also reads from Supabase when available) ─── */
const OPEN_HOUR_FALLBACK: Record<number, number> = {
  0: 14, 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9,
};
const CLOSE_HOUR_FALLBACK = 22;

function fmt12(h: number, m: number) {
  const period = h >= 12 ? "PM" : "AM";
  const dh = h % 12 === 0 ? 12 : h % 12;
  const dm = m === 0 ? "00" : "30";
  return `${dh}:${dm} ${period}`;
}

function getDayLabel(d: Date, today: Date) {
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Today";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
}

interface TimeSlot { label: string; value: string }

function generateSlots(
  openHours: Record<number, number>,
  closeHour: number
): TimeSlot[] {
  const now = new Date();
  const earliest = new Date(now.getTime() + 60 * 60 * 1000);
  const slots: TimeSlot[] = [];

  for (let dayOffset = 0; dayOffset <= 2 && slots.length < 20; dayOffset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);
    const openH = openHours[day.getDay()] ?? 9;

    for (let h = openH + 1; h < closeHour; h++) {
      for (const m of [0, 30]) {
        const slotTime = new Date(day);
        slotTime.setHours(h, m, 0, 0);
        if (slotTime < earliest) continue;
        slots.push({
          label: `${getDayLabel(day, now)}, ${fmt12(h, m)}`,
          value: slotTime.toISOString(),
        });
        if (slots.length >= 20) break;
      }
      if (slots.length >= 20) break;
    }
  }
  return slots;
}

function getHoursStatus(openHours: Record<number, number>, closeHour: number) {
  const now = new Date();
  const dow = now.getDay();
  const openH = openHours[dow] ?? 9;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60;
  const closeMins = closeHour * 60;

  if (nowMins >= openMins && nowMins < closeMins) {
    const closingIn = closeMins - nowMins;
    return {
      open: true,
      message: closingIn <= 60
        ? `Closing soon — closes at ${fmt12(closeHour, 0)}`
        : `Open now — closes at ${fmt12(closeHour, 0)}`,
    };
  }
  if (nowMins < openMins) {
    return {
      open: false,
      message: `We open at ${fmt12(openH, 0)} today — order now and choose a time slot!`,
    };
  }
  const tomorrowOpenH = openHours[(dow + 1) % 7] ?? 9;
  return {
    open: false,
    message: `Closed for today — opens tomorrow at ${fmt12(tomorrowOpenH, 0)}. You can still order!`,
  };
}

/* ─── Delivery zones from DB ─── */
type DeliveryZoneDB = { id: string; label: string; price: number; description?: string };

type CheckoutForm = {
  name: string;
  phone: string;
  address: string;
  email: string;
  deliveryZoneId: string;
  instructions: string;
  deliveryTime: string;
  referralCode: string;
};

export default function CartPanel() {
  const { items, isCartOpen, setIsCartOpen, removeItem, updateQuantity, addItem, subtotal, total, setDeliveryFee, deliveryFee, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { walletBalance, walletApplied, setWalletApplied, refresh: refreshRewards } = useRewards();

  /* keep a ref to profile so zone-sync effect can read it without re-running */
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Load dynamic data from Supabase
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZoneDB[]>([]);
  const [openHours, setOpenHours] = useState<Record<number, number>>(OPEN_HOUR_FALLBACK);
  const [closeHour, setCloseHour] = useState(CLOSE_HOUR_FALLBACK);
  const [referralValid, setReferralValid] = useState<null | boolean>(null);
  const [referralMsg, setReferralMsg] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [isPickup, setIsPickup] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");
  const [zoneOpen, setZoneOpen] = useState(false);
  const zoneDropdownRef = useRef<HTMLDivElement>(null);

  /* ── Promo code state ── */
  const [activePromos, setActivePromos] = useState<DBPromotion[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<DBPromotion | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoMsg, setPromoMsg] = useState("");
  const [promoMsgValid, setPromoMsgValid] = useState<boolean | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(e.target as Node)) {
        setZoneOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    supabase
      .from("delivery_zones")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data?.length) {
          setDeliveryZones(data as DeliveryZoneDB[]);
          setDeliveryFee((data as DeliveryZoneDB[])[0].price);
        }
      });
    supabase
      .from("operating_hours")
      .select("*")
      .order("day_of_week")
      .then(({ data }) => {
        if (data?.length) {
          const map: Record<number, number> = {};
          let maxClose = CLOSE_HOUR_FALLBACK;
          (data as any[]).forEach((h) => {
            if (!h.is_closed) map[h.day_of_week] = h.open_hour;
            if (h.close_hour > maxClose) maxClose = h.close_hour;
          });
          if (Object.keys(map).length) setOpenHours(map);
          setCloseHour(maxClose);
        }
      });
  }, []);

  /* Fetch active promos once on mount */
  useEffect(() => {
    supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) {
          const now = new Date();
          const valid = (data as DBPromotion[]).filter(p => {
            if (p.starts_at && new Date(p.starts_at) > now) return false;
            if (p.ends_at && new Date(p.ends_at) < now) return false;
            return true;
          });
          setActivePromos(valid);
        }
      });
  }, []);

  const slots = useMemo(() => generateSlots(openHours, closeHour), [openHours, closeHour]);
  const hoursStatus = useMemo(() => getHoursStatus(openHours, closeHour), [openHours, closeHour]);

  const [drinkNudgeDismissed, setDrinkNudgeDismissed] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState<CheckoutForm>({
    name: profile?.full_name || "",
    phone: profile?.phone || "",
    address: "", email: profile?.email || "",
    deliveryZoneId: "",
    instructions: "", deliveryTime: slots[0]?.value ?? "",
    referralCode: "",
  });

  /* Pre-fill user info (including saved address) when profile loads */
  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        name: f.name || profile.full_name || "",
        phone: f.phone || profile.phone || "",
        email: f.email || profile.email || "",
        address: f.address || profile.default_address || "",
      }));
    }
  }, [profile]);

  /* Sync delivery zone to saved profile zone only — no auto-select of first zone */
  useEffect(() => {
    if (deliveryZones.length && !form.deliveryZoneId) {
      const savedId = (profileRef.current as any)?.default_delivery_zone_id;
      const savedZone = savedId ? deliveryZones.find(z => z.id === savedId) : null;
      if (savedZone) {
        setForm((f) => ({ ...f, deliveryZoneId: savedZone.id }));
        setDeliveryFee(savedZone.price);
      }
      // New users see a blank — they must pick their own area
    }
  }, [deliveryZones]);

  // Unified zone list — Supabase when available, hardcoded fallback otherwise
  const allZones = useMemo(() => {
    if (deliveryZones.length > 0) return deliveryZones.map((z) => ({ id: z.id, label: z.label, price: z.price }));
    return DELIVERY_ZONES.map((z, i) => ({ id: String(i), label: z.label, price: z.price }));
  }, [deliveryZones]);

  const selectedZone = allZones.find((z) => z.id === form.deliveryZoneId) ?? null;
  const selectedSlot = slots.find((s) => s.value === form.deliveryTime) ?? slots[0];

  const filteredZones = useMemo(() =>
    zoneSearch.trim()
      ? allZones.filter((z) => z.label.toLowerCase().includes(zoneSearch.toLowerCase()))
      : allZones,
    [allZones, zoneSearch]
  );

  const handleZoneChange = (id: string, price: number) => {
    setForm((f) => ({ ...f, deliveryZoneId: id }));
    setDeliveryFee(price);
    setZoneSearch("");
    setZoneOpen(false);
  };

  const handleClose = () => { setIsCartOpen(false); setStep("cart"); };

  /* ── Wallet toggle ── */
  const handleApplyWallet = () => {
    if (walletApplied > 0) {
      setWalletApplied(0);
    } else {
      const maxApply = Math.min(walletBalance, total);
      setWalletApplied(maxApply);
    }
  };

  /* ── Referral code validation ── */
  const handleValidateReferral = async () => {
    const code = form.referralCode.trim().toUpperCase();
    if (!code) return;
    setValidatingCode(true);
    setReferralValid(null);
    const { data: refCode } = await supabase
      .from("referral_codes")
      .select("*, profiles(full_name)")
      .eq("code", code)
      .single();
    if (!refCode) {
      setReferralValid(false);
      setReferralMsg("Invalid referral code");
    } else if (user?.id && user.id === refCode.user_id) {
      setReferralValid(false);
      setReferralMsg("You cannot use your own referral code");
    } else {
      const referrerName = (refCode as any).profiles?.full_name ?? "a friend";
      setReferralValid(true);
      setReferralMsg(`Valid! Referred by ${referrerName}`);
    }
    setValidatingCode(false);
  };

  /* ── Promo code ── */
  function computePromoDiscount(promo: DBPromotion, cartSubtotal: number): number {
    if (promo.max_uses && promo.uses_count >= promo.max_uses) return 0;
    if (promo.min_order_amount && cartSubtotal < promo.min_order_amount) return 0;
    if (promo.discount_type === "percentage") {
      if (promo.applicable_product_ids?.length) {
        const eligibleTotal = items
          .filter(i => i.productId && promo.applicable_product_ids!.includes(i.productId))
          .reduce((s, i) => s + i.price * i.quantity, 0);
        return Math.round(eligibleTotal * promo.discount_value / 100);
      }
      return Math.round(cartSubtotal * promo.discount_value / 100);
    }
    if (promo.discount_type === "fixed") {
      return Math.min(promo.discount_value, cartSubtotal);
    }
    if (promo.discount_type === "free_product") {
      return promo.discount_value;
    }
    return 0;
  }

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoValidating(true);
    const promo = activePromos.find(p => p.code?.toUpperCase() === code);
    if (!promo) {
      setPromoMsg("Invalid promo code");
      setPromoMsgValid(false);
      setPromoApplied(null);
      setPromoDiscount(0);
    } else if (promo.max_uses && promo.uses_count >= promo.max_uses) {
      setPromoMsg("This promo code has expired (max uses reached)");
      setPromoMsgValid(false);
      setPromoApplied(null);
      setPromoDiscount(0);
    } else if (promo.min_order_amount && subtotal < promo.min_order_amount) {
      setPromoMsg(`Minimum order of ${formatPrice(promo.min_order_amount)} required`);
      setPromoMsgValid(false);
      setPromoApplied(null);
      setPromoDiscount(0);
    } else {
      const disc = computePromoDiscount(promo, subtotal);
      setPromoApplied(promo);
      setPromoDiscount(disc);
      if (promo.discount_type === "free_product") {
        setPromoMsg(`🎁 ${promo.free_product_name || "Free product"} added to your order!`);
      } else {
        setPromoMsg(`${formatPrice(disc)} off applied!`);
      }
      setPromoMsgValid(true);
    }
    setPromoValidating(false);
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoDiscount(0);
    setPromoCode("");
    setPromoMsg("");
    setPromoMsgValid(null);
  };

  /* ── Totals ── */
  const finalTotal = Math.max(0, total - walletApplied - promoDiscount);

  const STORE_ADDRESS = "4 Houses After The Poly, Parakin, Ile-Ife, Osun State";

  /* ── When pickup toggled, zero out delivery fee ── */
  useEffect(() => {
    if (isPickup) {
      setDeliveryFee(0);
    } else {
      // Restore fee from selected zone if one is already chosen, else 0
      const saved = allZones.find((z) => z.id === form.deliveryZoneId);
      setDeliveryFee(saved ? saved.price : 0);
    }
  }, [isPickup]);

  /* ── Build WhatsApp message ── */
  const buildWhatsAppMessage = () => {
    const lines = items.map((item) => {
      let line = `• ${item.name}`;
      if (item.size) line += ` (${item.size})`;
      if (item.extras?.length) line += ` + ${item.extras.map((e) => `${e.name} ×${e.quantity}`).join(", ")}`;
      if (item.removedIngredients?.length) line += ` [NO ${item.removedIngredients.join(", NO ")}]`;
      line += ` ×${item.quantity} = ${formatPrice(item.price * item.quantity)}`;
      if (item.note) line += `\n  Note: ${item.note}`;
      return line;
    });

    const fulfillmentLine = isPickup
      ? `🏪 Order Type: PICK UP at O'chel Foods Storefront\n📍 ${STORE_ADDRESS}\n`
      : `🚚 Order Type: Delivery\n📍 Delivery Area: ${selectedZone?.label ?? "—"} — ${formatPrice(deliveryFee)}\n`;

    // If a free-product promo is applied, append it as a line item
    if (promoApplied?.discount_type === "free_product" && promoApplied?.free_product_name) {
      lines.push(`• 🎁 ${promoApplied.free_product_name} (FREE — promo ${promoApplied.code}) ×1`);
    }

    return encodeURIComponent(
      `Hello O'chel Foods! I'd like to place an order:\n\n` +
      `${lines.join("\n")}\n\n` +
      `Subtotal: ${formatPrice(subtotal)}\n` +
      (isPickup ? "" : `Delivery fee: ${formatPrice(deliveryFee)}\n`) +
      (walletApplied > 0 ? `Wallet discount: -${formatPrice(walletApplied)}\n` : "") +
      (promoDiscount > 0 ? `Promo discount (${promoApplied?.code ?? ""}): -${formatPrice(promoDiscount)}\n` : "") +
      (form.referralCode && referralValid ? `Referral code: ${form.referralCode}\n` : "") +
      `Total: ${formatPrice(finalTotal)}\n\n` +
      `🕐 ${isPickup ? "Pick Up" : "Delivery"} Time: ${selectedSlot?.label ?? "ASAP"}\n\n` +
      fulfillmentLine + `\n` +
      `👤 Contact Details:\n` +
      `Name: ${form.name}\n` +
      `Phone: ${form.phone}\n` +
      (!isPickup && form.address ? `Address: ${form.address}\n` : "") +
      (form.instructions ? `Instructions: ${form.instructions}\n` : "") +
      `\nPlease confirm my order. Thank you!`
    );
  };

  /* ── Save order to DB + open WhatsApp ── */
  const handlePlaceOrder = async () => {
    if (!canCheckout) return;

    // Open WhatsApp IMMEDIATELY — must happen synchronously before any awaits
    // or browsers will block it as an unsolicited popup.
    window.open(`https://wa.me/2349056351651?text=${buildWhatsAppMessage()}`, "_blank", "noopener,noreferrer");

    // Snapshot items before clearing cart
    const snapshotItems = [...items];

    // Close cart and clear state right away so the user sees a clean exit
    clearCart();
    setWalletApplied(0);
    handleClose();

    // Snapshot promo before clearing
    const usedPromo = promoApplied;
    const usedPromoDiscount = promoDiscount;
    handleRemovePromo();

    // Save order to DB — try API server first, fall back to direct Supabase insert
    setSavingOrder(true);

    const orderPayload = {
      user_id: user?.id ?? null,
      customer_name: form.name,
      customer_phone: form.phone,
      customer_email: form.email || null,
      delivery_address: isPickup ? `PICK UP: ${STORE_ADDRESS}` : form.address,
      delivery_zone_id: isPickup ? null : (form.deliveryZoneId || null),
      delivery_fee: isPickup ? 0 : deliveryFee,
      subtotal,
      total: finalTotal,
      discount_amount: walletApplied + usedPromoDiscount,
      referral_wallet_used: walletApplied,
      promo_code: usedPromo?.code ?? null,
      delivery_time: selectedSlot?.label ?? null,
      special_instructions: form.instructions || null,
      referral_code_used: (referralValid && form.referralCode) ? form.referralCode.toUpperCase() : null,
    };

    let savedViaApi = false;
    try {
      const res = await fetch(apiUrl("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderPayload,
          items: snapshotItems.map((i) => ({
            productId: i.productId || null,
            name: i.name,
            size: i.size || null,
            price: i.price,
            quantity: i.quantity,
            extras: i.extras || null,
            removedIngredients: i.removedIngredients || null,
            note: i.note || null,
          })),
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) savedViaApi = true;
    } catch { /* API unreachable — fall through */ }

    if (!savedViaApi) {
      // Fallback: write directly to Supabase (requires anon INSERT policy on orders table)
      try {
        const { data: order } = await supabase
          .from("orders")
          .insert({ ...orderPayload, status: "unpaid" })
          .select()
          .single();

        if (order && snapshotItems.length) {
          await supabase.from("order_items").insert(
            snapshotItems.map((i) => ({
              order_id: order.id,
              product_id: i.productId || null,
              product_name: i.name,
              size: i.size || null,
              price: i.price,
              quantity: i.quantity,
              extras: i.extras || null,
              removed_ingredients: i.removedIngredients || null,
              note: i.note || null,
            }))
          );
        }
      } catch { /* Non-blocking — order was sent via WhatsApp */ }
    }

    /* Save delivery details to profile for next time */
    if (user?.id && !isPickup && form.address) {
      await supabase.from("profiles").update({
        default_address: form.address,
        default_delivery_zone_id: form.deliveryZoneId || null,
      }).eq("id", user.id);
    }

    if (user?.id) refreshRewards();
    setSavingOrder(false);
  };

  const canCheckout = form.name.trim() && form.phone.trim() && (isPickup || (form.address.trim() && form.deliveryZoneId));
  const fieldClass = "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-4 py-3 text-sm font-[Montserrat] focus:outline-none bg-white";

  return (
    <Sheet open={isCartOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col" hideClose>
        <SheetTitle className="sr-only">{step === "cart" ? "Your Cart" : "Checkout"}</SheetTitle>

        {/* Header */}
        <div className="bg-[#E8192C] text-white px-5 py-4 flex items-center gap-3 flex-shrink-0">
          {/* Cart step: back arrow closes panel. Checkout step: back arrow goes to cart. */}
          <button
            onClick={step === "cart" ? handleClose : () => setStep("cart")}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label={step === "cart" ? "Close cart" : "Back to cart"}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <ShoppingBag className="w-6 h-6" />
          <h2 className="font-chewy text-xl flex-1">{step === "cart" ? "Your Order" : "Checkout"}</h2>
          {step === "cart" && items.length > 0 && (
            <span className="bg-[#FFB800] text-black text-xs font-bold px-2 py-0.5 rounded-full font-[Montserrat]">
              {items.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          )}
        </div>

        {/* Hours status */}
        <div className={`px-4 py-2 flex items-center gap-2 text-xs font-[Montserrat] border-b ${
          hoursStatus.open ? "bg-green-50 border-green-100 text-green-800" : "bg-amber-50 border-amber-100 text-amber-800"
        }`}>
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{hoursStatus.message}</span>
        </div>

        {/* Wallet banner (only for logged-in users with balance) */}
        {user && walletBalance > 0 && step === "checkout" && (
          <div className="mx-4 mt-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold font-[Montserrat] text-green-800">
                  Referral Wallet: {formatPrice(walletBalance)}
                </p>
                <p className="text-xs text-green-600 font-[Montserrat]">
                  {walletApplied > 0 ? `−${formatPrice(walletApplied)} applied` : "Use as discount?"}
                </p>
              </div>
            </div>
            <button
              onClick={handleApplyWallet}
              className={`text-xs font-bold font-[Montserrat] px-3 py-1.5 rounded-lg transition-colors ${
                walletApplied > 0
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-white border border-green-300 text-green-700 hover:bg-green-50"
              }`}
            >
              {walletApplied > 0 ? "Applied ✓" : "Apply"}
            </button>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="font-chewy text-2xl text-gray-400 mb-2">Your cart is empty</h3>
            <p className="text-gray-400 text-sm font-[Montserrat]">Add some delicious items to get started!</p>
            <button onClick={handleClose}
              className="mt-6 bg-[#E8192C] text-white px-6 py-3 rounded-xl font-bold font-[Montserrat] hover:bg-[#c8151f]">
              Browse Menu
            </button>
          </div>

        ) : step === "cart" ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                  <div className="flex gap-3">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-chewy text-base text-gray-900 leading-tight">{item.name}</h4>
                      {item.size && <p className="text-xs text-gray-500 font-[Montserrat]">{item.size}</p>}
                      {item.extras?.length > 0 && (
                        <p className="text-xs text-green-700 font-[Montserrat]">
                          + {item.extras.map((e) => `${e.name} ×${e.quantity}`).join(", ")}
                        </p>
                      )}
                      {item.removedIngredients?.length > 0 && (
                        <p className="text-xs text-orange-600 font-[Montserrat]">No: {item.removedIngredients.join(", ")}</p>
                      )}
                      {item.note && <p className="text-xs text-gray-400 font-[Montserrat] italic">"{item.note}"</p>}
                      <p className="font-chewy text-[#E8192C] mt-0.5">{formatPrice(item.price)}</p>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 h-fit">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-sm w-5 text-center font-[Montserrat]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-[#E8192C] text-white flex items-center justify-center hover:bg-[#c8151f]">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-chewy text-gray-800 text-base">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}

              {/* ── Drink upsell nudge ── */}
              {!drinkNudgeDismissed && !items.some((i) => i.category === "drinks") && (
                <div className="mt-1 rounded-2xl border-2 border-[#FFB800] bg-amber-50 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">🥤</span>
                      <p className="font-chewy text-base text-gray-900 leading-tight">
                        Complete your meal with a drink!
                      </p>
                    </div>
                    <button
                      onClick={() => setDrinkNudgeDismissed(true)}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
                      aria-label="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {drinkProducts.map((drink) => (
                      <div key={drink.id} className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 border border-amber-100">
                        <div className="min-w-0">
                          <p className="font-[Montserrat] text-sm font-semibold text-gray-800 leading-tight truncate">
                            {drink.name}
                          </p>
                          <p className="font-chewy text-[#E8192C] text-sm">{formatPrice(drink.basePrice)}</p>
                        </div>
                        <button
                          onClick={() => {
                            addItem({
                              productId: drink.id,
                              name: drink.name,
                              category: "drinks",
                              price: drink.basePrice,
                              quantity: 1,
                              imageUrl: drink.imageUrl,
                            });
                            toast.success(`${drink.name} added!`);
                          }}
                          className="flex-shrink-0 bg-[#FFB800] hover:bg-[#e5a600] text-black text-xs font-bold px-3 py-1.5 rounded-lg font-[Montserrat] transition-colors"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 flex-shrink-0">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm font-[Montserrat]">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-[Montserrat]">
                  <span className="text-gray-600">Delivery (est.)</span>
                  <span className="font-semibold text-[#E8192C]">
                    {deliveryZones.length ? `from ${formatPrice(deliveryZones[0].price)}` : "—"}
                  </span>
                </div>
              </div>
              <button onClick={() => setStep("checkout")}
                className="w-full bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold py-3 px-6 rounded-xl font-[Montserrat]">
                Proceed to Checkout
              </button>
            </div>
          </>

        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-chewy text-lg text-gray-800 mb-3">Order Summary</h3>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm font-[Montserrat]">
                      <span className="text-gray-600 truncate flex-1 mr-2">
                        {item.name} ×{item.quantity}
                        {item.size && <span className="text-gray-400"> ({item.size})</span>}
                      </span>
                      <span className="font-semibold flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                {selectedSlot && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 text-sm font-[Montserrat]">
                    <Clock className="w-4 h-4 text-[#E8192C] flex-shrink-0" />
                    <span className="text-gray-500">Delivery time:</span>
                    <span className="font-semibold text-gray-800">{selectedSlot.label}</span>
                  </div>
                )}
              </div>

              {/* ── Delivery / Pick Up toggle ── */}
              <div className="flex rounded-xl overflow-hidden border-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsPickup(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold font-[Montserrat] transition-colors ${
                    !isPickup ? "bg-[#E8192C] text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Bike className="w-4 h-4" /> Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setIsPickup(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold font-[Montserrat] transition-colors border-l-2 border-gray-200 ${
                    isPickup ? "bg-[#E8192C] text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Store className="w-4 h-4" /> Pick Up
                </button>
              </div>

              {/* Pick Up location banner */}
              {isPickup && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold font-[Montserrat] text-green-800">Pick Up at O'chel Foods Storefront</p>
                    <p className="text-xs font-[Montserrat] text-green-700 mt-0.5">{STORE_ADDRESS}</p>
                    <p className="text-xs font-[Montserrat] text-green-600 mt-1">No delivery fee — come collect your order!</p>
                  </div>
                </div>
              )}

              {/* Preferred time */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">
                  {isPickup ? "Preferred Pick Up Time" : "Preferred Delivery Time"}
                </label>
                {slots.length === 0 ? (
                  <p className="text-sm text-orange-600 font-[Montserrat] bg-orange-50 rounded-xl px-4 py-3">
                    No slots available right now. Check back during operating hours.
                  </p>
                ) : (
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select value={form.deliveryTime} onChange={(e) => setForm((f) => ({ ...f, deliveryTime: e.target.value }))}
                      className={`${fieldClass} pl-9 pr-10 appearance-none`}>
                      {slots.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                )}
                <div className="mt-2 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 font-[Montserrat]">
                    {isPickup
                      ? "Orders are typically ready within 30 minutes. Please arrive at your chosen time."
                      : "Orders are typically prepared within 30 minutes. Time shown includes prep and delivery."}
                  </p>
                </div>
              </div>

              {/* Delivery zone — only shown for delivery */}
              {!isPickup && (
                <div>
                  <label className="font-chewy text-lg text-gray-800 mb-2 block">Delivery Area</label>
                  <p className="text-xs text-gray-400 font-[Montserrat] mb-2">Select your zone for an instant delivery cost estimate</p>
                  <div className="relative" ref={zoneDropdownRef}>
                    <button
                      type="button"
                      onClick={() => { setZoneOpen((o) => !o); setZoneSearch(""); }}
                      className={`${fieldClass} pr-10 text-left flex items-center justify-between`}
                    >
                      <span className={selectedZone ? "text-gray-800" : "text-gray-400"}>
                        {selectedZone ? `${selectedZone.label} — ${formatPrice(selectedZone.price)}` : "Select delivery area…"}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${zoneOpen ? "rotate-180" : ""}`} />
                    </button>
                    {zoneOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search location…"
                            value={zoneSearch}
                            onChange={(e) => setZoneSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm font-[Montserrat] border border-gray-200 rounded-lg focus:outline-none focus:border-[#E8192C]"
                          />
                        </div>
                        <ul className="max-h-52 overflow-y-auto">
                          {filteredZones.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-gray-400 font-[Montserrat]">No locations found</li>
                          ) : (
                            filteredZones.map((z) => (
                              <li key={z.id}>
                                <button
                                  type="button"
                                  onClick={() => handleZoneChange(z.id, z.price)}
                                  className={`w-full text-left px-4 py-2.5 text-sm font-[Montserrat] flex items-center justify-between hover:bg-red-50 transition-colors ${form.deliveryZoneId === z.id ? "bg-red-50 text-[#E8192C] font-semibold" : "text-gray-700"}`}
                                >
                                  <span>{z.label}</span>
                                  <span className="font-chewy text-base ml-2 flex-shrink-0">{formatPrice(z.price)}</span>
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-2">
                    <span className="text-sm font-[Montserrat] text-gray-600">Delivery fee</span>
                    <span className="font-chewy text-[#E8192C] text-lg">{formatPrice(deliveryFee)}</span>
                  </div>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">Full Name *</label>
                <input type="text" placeholder="Enter your full name" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={fieldClass} />
              </div>

              {/* Phone */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">Phone Number *</label>
                <input type="tel" placeholder="+234 800 000 0000" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={fieldClass} />
              </div>

              {/* Email (optional) */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">
                  Email <span className="text-sm text-gray-400 font-[Montserrat] font-normal">(optional)</span>
                </label>
                <input type="email" placeholder="your@email.com" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={fieldClass} />
              </div>

              {/* Address — only for delivery */}
              {!isPickup && (
                <div>
                  <label className="font-chewy text-lg text-gray-800 mb-1 block">Delivery Address *</label>
                  <textarea placeholder="Enter your full delivery address..." value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className={`${fieldClass} resize-none`} rows={3} />
                  {/* Guest signup nudge */}
                  {!user && (
                    <p className="mt-1.5 text-xs text-gray-400 font-[Montserrat]">
                      <a href="/login" className="text-[#E8192C] font-semibold hover:underline">Sign in</a>
                      {" "}to save your address &amp; details for next time
                    </p>
                  )}
                  {user && (
                    <p className="mt-1.5 text-xs text-green-600 font-[Montserrat] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Your details will be saved automatically
                    </p>
                  )}
                </div>
              )}

              {/* Special instructions */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">
                  Special Instructions <span className="text-sm text-gray-400 font-[Montserrat] font-normal">(optional)</span>
                </label>
                <textarea placeholder="Any other notes..." value={form.instructions}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  className={`${fieldClass} resize-none`} rows={2} />
              </div>

              {/* ── Promo code ── */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">
                  Promo Code <span className="text-sm text-gray-400 font-[Montserrat] font-normal">(optional)</span>
                </label>
                {promoApplied ? (
                  <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold font-[Montserrat] text-purple-800">
                          {promoApplied.code}
                        </p>
                        <p className="text-xs font-[Montserrat] text-purple-600">{promoMsg}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-xs font-bold font-[Montserrat] text-purple-600 hover:text-purple-800 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Enter promo code"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value.toUpperCase());
                            setPromoMsg("");
                            setPromoMsgValid(null);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                          className={`${fieldClass} pl-10 uppercase`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={!promoCode.trim() || promoValidating}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-[Montserrat] font-semibold disabled:opacity-40 transition-colors"
                      >
                        {promoValidating ? "…" : "Apply"}
                      </button>
                    </div>
                    {promoMsg && (
                      <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-[Montserrat] ${promoMsgValid ? "text-green-600" : "text-red-500"}`}>
                        {promoMsgValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {promoMsg}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Referral code */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">
                  Referral Code <span className="text-sm text-gray-400 font-[Montserrat] font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Enter a referral code"
                      value={form.referralCode}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, referralCode: e.target.value.toUpperCase() }));
                        setReferralValid(null);
                      }}
                      className={`${fieldClass} pl-10 uppercase`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleValidateReferral}
                    disabled={!form.referralCode.trim() || validatingCode}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-[Montserrat] font-semibold disabled:opacity-40"
                  >
                    {validatingCode ? "…" : "Apply"}
                  </button>
                </div>
                {referralMsg && (
                  <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-[Montserrat] ${referralValid ? "text-green-600" : "text-red-500"}`}>
                    {referralValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {referralMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Checkout footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-5 pt-3 pb-4 flex-shrink-0">
              {/* Collapsible breakdown — tap total row to expand */}
              <button
                type="button"
                onClick={() => setSummaryExpanded((v) => !v)}
                className="w-full flex items-center justify-between mb-2"
              >
                <span className="font-chewy text-lg text-gray-900">
                  Total: {formatPrice(finalTotal)}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400 font-[Montserrat]">
                  {summaryExpanded ? "Hide" : "See breakdown"}
                  <ChevronDown className={`w-4 h-4 transition-transform ${summaryExpanded ? "rotate-180" : ""}`} />
                </span>
              </button>

              {summaryExpanded && (
                <div className="space-y-1.5 mb-3 pb-3 border-b border-gray-200">
                  <div className="flex justify-between text-sm font-[Montserrat]">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-[Montserrat]">
                    <span className="text-gray-500">Delivery</span>
                    <span className="font-semibold">{formatPrice(deliveryFee)}</span>
                  </div>
                  {walletApplied > 0 && (
                    <div className="flex justify-between text-sm font-[Montserrat] text-green-600">
                      <span>Wallet discount</span>
                      <span className="font-semibold">−{formatPrice(walletApplied)}</span>
                    </div>
                  )}
                  {promoApplied?.discount_type === "free_product" && promoApplied?.free_product_name && (
                    <div className="flex justify-between text-sm font-[Montserrat] text-purple-600">
                      <span>🎁 {promoApplied.free_product_name} (FREE)</span>
                      <span className="font-semibold">−{formatPrice(promoDiscount)}</span>
                    </div>
                  )}
                  {promoDiscount > 0 && promoApplied?.discount_type !== "free_product" && (
                    <div className="flex justify-between text-sm font-[Montserrat] text-purple-600">
                      <span>Promo {promoApplied?.code ? `(${promoApplied.code})` : "discount"}</span>
                      <span className="font-semibold">−{formatPrice(promoDiscount)}</span>
                    </div>
                  )}
                  {selectedSlot && (
                    <div className="flex justify-between text-sm font-[Montserrat]">
                      <span className="text-gray-500">Delivery time</span>
                      <span className="font-semibold text-gray-700 text-right max-w-[55%]">{selectedSlot.label}</span>
                    </div>
                  )}
                </div>
              )}

              {!canCheckout && (
                <p className="text-xs text-gray-400 font-[Montserrat] text-center mb-2">
                  {!form.name.trim() || !form.phone.trim()
                    ? "Fill in Name & Phone to continue"
                    : !isPickup && !form.deliveryZoneId
                    ? "Please select your Delivery Area to continue"
                    : "Fill in your delivery Address to continue"}
                </p>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={!canCheckout || savingOrder}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl font-[Montserrat] transition-colors ${
                  canCheckout && !savingOrder
                    ? "bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {savingOrder ? "Sending…" : "Order via WhatsApp"}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
