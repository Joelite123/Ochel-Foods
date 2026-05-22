import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ChevronDown,
  Clock, Info, Wallet, Tag, Check, X,
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

  // Load dynamic data from Supabase
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZoneDB[]>([]);
  const [openHours, setOpenHours] = useState<Record<number, number>>(OPEN_HOUR_FALLBACK);
  const [closeHour, setCloseHour] = useState(CLOSE_HOUR_FALLBACK);
  const [referralValid, setReferralValid] = useState<null | boolean>(null);
  const [referralMsg, setReferralMsg] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");
  const [zoneOpen, setZoneOpen] = useState(false);
  const zoneDropdownRef = useRef<HTMLDivElement>(null);

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

  // Pre-fill user info when profile loads
  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        name: f.name || profile.full_name || "",
        phone: f.phone || profile.phone || "",
        email: f.email || profile.email || "",
      }));
    }
  }, [profile]);

  // Sync delivery zone to first zone
  useEffect(() => {
    if (deliveryZones.length && !form.deliveryZoneId) {
      setForm((f) => ({ ...f, deliveryZoneId: deliveryZones[0].id }));
    }
  }, [deliveryZones]);

  // Unified zone list — Supabase when available, hardcoded fallback otherwise
  const allZones = useMemo(() => {
    if (deliveryZones.length > 0) return deliveryZones.map((z) => ({ id: z.id, label: z.label, price: z.price }));
    return DELIVERY_ZONES.map((z, i) => ({ id: String(i), label: z.label, price: z.price }));
  }, [deliveryZones]);

  const selectedZone = allZones.find((z) => z.id === form.deliveryZoneId) ?? allZones[0];
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

  /* ── Totals ── */
  const finalTotal = Math.max(0, total - walletApplied);

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

    return encodeURIComponent(
      `Hello O'chel Foods! I'd like to place an order:\n\n` +
      `${lines.join("\n")}\n\n` +
      `Subtotal: ${formatPrice(subtotal)}\n` +
      `Delivery (${selectedZone?.label ?? "—"}): ${formatPrice(deliveryFee)}\n` +
      (walletApplied > 0 ? `Wallet discount: -${formatPrice(walletApplied)}\n` : "") +
      (form.referralCode && referralValid ? `Referral code: ${form.referralCode}\n` : "") +
      `Total: ${formatPrice(finalTotal)}\n\n` +
      `🕐 Preferred Delivery Time: ${selectedSlot?.label ?? "ASAP"}\n\n` +
      `📍 Delivery Details:\n` +
      `Name: ${form.name}\n` +
      `Phone: ${form.phone}\n` +
      `Address: ${form.address}\n` +
      (form.instructions ? `Instructions: ${form.instructions}\n` : "") +
      `\nPlease confirm my order. Thank you!`
    );
  };

  /* ── Save order to DB + open WhatsApp ── */
  const handlePlaceOrder = async () => {
    if (!canCheckout) return;
    setSavingOrder(true);
    try {
      const promoDiscount = 0;

      // Insert order
      const { data: order } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id ?? null,
          customer_name: form.name,
          customer_phone: form.phone,
          customer_email: form.email || null,
          delivery_address: form.address,
          delivery_zone_id: form.deliveryZoneId || null,
          delivery_fee: deliveryFee,
          subtotal,
          total: finalTotal - promoDiscount,
          discount_amount: walletApplied + promoDiscount,
          referral_wallet_used: walletApplied,
          promo_code: null,
          status: "pending",
          delivery_time: selectedSlot?.label ?? null,
          special_instructions: form.instructions || null,
          referral_code_used: (referralValid && form.referralCode) ? form.referralCode.toUpperCase() : null,
        })
        .select()
        .single();

      if (order) {
        // Insert order items
        if (items.length) {
          await supabase.from("order_items").insert(
            items.map((i) => ({
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

        // Deduct wallet balance if used
        if (user?.id && walletApplied > 0) {
          const { data: rewards } = await supabase
            .from("user_rewards")
            .select("*")
            .eq("user_id", user.id)
            .eq("reward_type", "cash_credit")
            .eq("is_used", false)
            .gt("balance", 0)
            .order("expires_at", { ascending: true });

          let remaining = walletApplied;
          for (const reward of rewards ?? []) {
            if (remaining <= 0) break;
            const deduct = Math.min(remaining, Number(reward.balance));
            const newBalance = Number(reward.balance) - deduct;
            await supabase
              .from("user_rewards")
              .update({ balance: newBalance, is_used: newBalance <= 0 })
              .eq("id", reward.id);
            remaining -= deduct;
          }

          const { data: profileData } = await supabase
            .from("profiles")
            .select("referral_wallet_balance")
            .eq("id", user.id)
            .single();
          if (profileData) {
            await supabase.from("profiles").update({
              referral_wallet_balance: Math.max(
                0,
                Number(profileData.referral_wallet_balance) - walletApplied
              ),
            }).eq("id", user.id);
          }

          refreshRewards();
        }
      }
    } catch {
      // Non-blocking — still open WhatsApp even if DB save fails
    }
    setSavingOrder(false);

    // Open WhatsApp
    window.open(`https://wa.me/2349056351651?text=${buildWhatsAppMessage()}`, "_blank", "noopener,noreferrer");
    clearCart();
    setWalletApplied(0);
    handleClose();
  };

  const canCheckout = form.name.trim() && form.phone.trim() && form.address.trim();
  const fieldClass = "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-4 py-3 text-sm font-[Montserrat] focus:outline-none bg-white";

  return (
    <Sheet open={isCartOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetTitle className="sr-only">{step === "cart" ? "Your Cart" : "Checkout"}</SheetTitle>

        {/* Header */}
        <div className="bg-[#E8192C] text-white px-5 py-4 flex items-center gap-3 flex-shrink-0">
          {step === "checkout" && (
            <button onClick={() => setStep("cart")} className="p-1 hover:bg-white/20 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
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

              {/* Delivery time */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">Preferred Delivery Time</label>
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
                    Orders are typically prepared within 30 minutes. Time shown includes prep and delivery.
                  </p>
                </div>
              </div>

              {/* Delivery zone — searchable dropdown */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-2 block">Delivery Area</label>
                <p className="text-xs text-gray-400 font-[Montserrat] mb-2">Select your zone for an instant delivery cost estimate</p>
                <div className="relative" ref={zoneDropdownRef}>
                  {/* Trigger button */}
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

                  {/* Dropdown panel */}
                  {zoneOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {/* Search input */}
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
                      {/* Zone list */}
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

              {/* Address */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">Delivery Address *</label>
                <textarea placeholder="Enter your full delivery address..." value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className={`${fieldClass} resize-none`} rows={3} />
              </div>

              {/* Special instructions */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">
                  Special Instructions <span className="text-sm text-gray-400 font-[Montserrat] font-normal">(optional)</span>
                </label>
                <textarea placeholder="Any other notes..." value={form.instructions}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  className={`${fieldClass} resize-none`} rows={2} />
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
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 flex-shrink-0">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm font-[Montserrat]">
                  <span className="text-gray-600">Subtotal</span><span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-[Montserrat]">
                  <span className="text-gray-600">Delivery</span><span className="font-semibold">{formatPrice(deliveryFee)}</span>
                </div>
                {walletApplied > 0 && (
                  <div className="flex justify-between text-sm font-[Montserrat] text-green-600">
                    <span>Wallet discount</span><span className="font-semibold">−{formatPrice(walletApplied)}</span>
                  </div>
                )}
                {selectedSlot && (
                  <div className="flex justify-between text-sm font-[Montserrat]">
                    <span className="text-gray-600">Delivery time</span>
                    <span className="font-semibold text-gray-700">{selectedSlot.label}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                  <span className="font-chewy text-lg">Total</span>
                  <span className="font-chewy text-lg text-[#E8192C]">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {!canCheckout && (
                <p className="text-xs text-gray-400 font-[Montserrat] text-center mb-2">
                  Please fill in Name, Phone, and Address to continue
                </p>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={!canCheckout || savingOrder}
                className={`block w-full text-center font-bold py-3 px-6 rounded-xl font-[Montserrat] transition-colors ${
                  canCheckout && !savingOrder
                    ? "bg-[#E8192C] hover:bg-[#c8151f] text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {savingOrder ? "Placing order…" : "Place Order via WhatsApp"}
              </button>

              <p className="text-xs text-gray-400 font-[Montserrat] text-center mt-2">
                You'll be redirected to WhatsApp to confirm
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
