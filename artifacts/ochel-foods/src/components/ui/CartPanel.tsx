import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ChevronDown, Clock, Info } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { DELIVERY_ZONES, formatPrice } from "@/data/menuData";

/* ─────────────────────────────────────────────
   Delivery time-slot helpers
───────────────────────────────────────────── */

/** Operating hours per day-of-week (0 = Sunday) */
const OPEN_HOUR: Record<number, number> = {
  0: 14, // Sunday  — 2 PM
  1: 9,  2: 9, 3: 9, 4: 9, 5: 9, 6: 9, // Mon–Sat — 9 AM
};
const CLOSE_HOUR = 22; // 10 PM every day

function fmt12(h: number, m: number) {
  const period = h >= 12 ? "PM" : "AM";
  const dh = h % 12 === 0 ? 12 : h % 12;
  const dm = m === 0 ? "00" : "30";
  return `${dh}:${dm} ${period}`;
}

function getDayLabel(d: Date, today: Date) {
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) return "Today";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
}

interface TimeSlot {
  label: string;
  value: string; // ISO string of the slot datetime
}

function generateSlots(): TimeSlot[] {
  const now = new Date();
  // Earliest selectable slot = now + 60 min (buffer for prep + delivery)
  const earliest = new Date(now.getTime() + 60 * 60 * 1000);
  const slots: TimeSlot[] = [];

  // Scan today + next 2 days so late-night orderers always see options
  for (let dayOffset = 0; dayOffset <= 2 && slots.length < 20; dayOffset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);
    const dow = day.getDay();
    const openH = OPEN_HOUR[dow] ?? 9;

    for (let h = openH; h < CLOSE_HOUR; h++) {
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

/* ─────────────────────────────────────────────
   Operating-hours status banner
───────────────────────────────────────────── */
function getHoursStatus(): { open: boolean; message: string } {
  const now = new Date();
  const dow = now.getDay();
  const openH = OPEN_HOUR[dow] ?? 9;
  const h = now.getHours();
  const m = now.getMinutes();
  const nowMins = h * 60 + m;
  const openMins = openH * 60;
  const closeMins = CLOSE_HOUR * 60;

  if (nowMins >= openMins && nowMins < closeMins) {
    const closingIn = closeMins - nowMins;
    if (closingIn <= 60) {
      return { open: true, message: `Closing soon — closes at 10:00 PM` };
    }
    return { open: true, message: `Open now — closes at 10:00 PM` };
  }

  // Before open
  if (nowMins < openMins) {
    return {
      open: false,
      message: `We open at ${fmt12(openH, 0)} today — order now and choose a time slot!`,
    };
  }
  // After close
  const tomorrowDow = (dow + 1) % 7;
  const tomorrowOpenH = OPEN_HOUR[tomorrowDow] ?? 9;
  return {
    open: false,
    message: `Closed for today — opens tomorrow at ${fmt12(tomorrowOpenH, 0)}. You can still order!`,
  };
}

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type CheckoutForm = {
  name: string;
  phone: string;
  address: string;
  deliveryZoneIndex: number;
  instructions: string;
  deliveryTime: string; // ISO string of chosen slot
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function CartPanel() {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    removeItem,
    updateQuantity,
    subtotal,
    deliveryFee,
    setDeliveryFee,
    total,
  } = useCart();

  const slots = useMemo(() => generateSlots(), []);
  const hoursStatus = useMemo(() => getHoursStatus(), []);

  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    phone: "",
    address: "",
    deliveryZoneIndex: 0,
    instructions: "",
    deliveryTime: slots[0]?.value ?? "",
  });

  const selectedZone = DELIVERY_ZONES[form.deliveryZoneIndex];
  const selectedSlot = slots.find((s) => s.value === form.deliveryTime) ?? slots[0];

  const handleZoneChange = (idx: number) => {
    setForm((f) => ({ ...f, deliveryZoneIndex: idx }));
    setDeliveryFee(DELIVERY_ZONES[idx].price);
  };

  const handleClose = () => {
    setIsCartOpen(false);
    setStep("cart");
  };

  const buildWhatsAppMessage = () => {
    const lines = items.map((item) => {
      let line = `• ${item.name}`;
      if (item.size) line += ` (${item.size})`;
      if (item.extras?.length) {
        line += ` + ${item.extras.map((e) => `${e.name} ×${e.quantity}`).join(", ")}`;
      }
      if (item.removedIngredients?.length) {
        line += ` [NO ${item.removedIngredients.join(", NO ")}]`;
      }
      line += ` ×${item.quantity} = ${formatPrice(item.price * item.quantity)}`;
      if (item.note) line += `\n  Note: ${item.note}`;
      return line;
    });

    const msg =
      `Hello O'chel Foods! I'd like to place an order:\n\n` +
      `${lines.join("\n")}\n\n` +
      `Subtotal: ${formatPrice(subtotal)}\n` +
      `Delivery (${selectedZone.label}): ${formatPrice(deliveryFee)}\n` +
      `Total: ${formatPrice(total)}\n\n` +
      `🕐 Preferred Delivery Time: ${selectedSlot?.label ?? "ASAP"}\n\n` +
      `📍 Delivery Details:\n` +
      `Name: ${form.name}\n` +
      `Phone: ${form.phone}\n` +
      `Address: ${form.address}\n` +
      (form.instructions ? `Instructions: ${form.instructions}\n` : "") +
      `\nPlease confirm my order. Thank you!`;

    return encodeURIComponent(msg);
  };

  const canCheckout = form.name.trim() && form.phone.trim() && form.address.trim();

  /* ─── Shared field style ─── */
  const fieldClass =
    "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-4 py-3 text-sm font-[Montserrat] focus:outline-none bg-white";

  return (
    <Sheet open={isCartOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetTitle className="sr-only">
          {step === "cart" ? "Your Cart" : "Checkout"}
        </SheetTitle>

        {/* Header */}
        <div className="bg-[#E8192C] text-white px-5 py-4 flex items-center gap-3 flex-shrink-0">
          {step === "checkout" && (
            <button
              onClick={() => setStep("cart")}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              data-testid="button-back-to-cart"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <ShoppingBag className="w-6 h-6" />
          <h2 className="font-chewy text-xl flex-1">
            {step === "cart" ? "Your Order" : "Checkout"}
          </h2>
          {step === "cart" && items.length > 0 && (
            <span className="bg-[#FFB800] text-black text-xs font-bold px-2 py-0.5 rounded-full font-[Montserrat]">
              {items.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          )}
        </div>

        {/* Hours status banner */}
        <div
          className={`px-4 py-2 flex items-center gap-2 text-xs font-[Montserrat] border-b ${
            hoursStatus.open
              ? "bg-green-50 border-green-100 text-green-800"
              : "bg-amber-50 border-amber-100 text-amber-800"
          }`}
        >
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{hoursStatus.message}</span>
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" data-testid="cart-empty">
            <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="font-chewy text-2xl text-gray-400 mb-2">Your cart is empty</h3>
            <p className="text-gray-400 text-sm font-[Montserrat]">Add some delicious items to get started!</p>
            <button
              onClick={handleClose}
              data-testid="button-continue-shopping"
              className="mt-6 bg-[#E8192C] text-white px-6 py-3 rounded-xl font-bold font-[Montserrat] hover:bg-[#c8151f] transition-colors"
            >
              Browse Menu
            </button>
          </div>

        ) : step === "cart" ? (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm"
                  data-testid={`cart-item-${item.id}`}
                >
                  <div className="flex gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
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
                        <p className="text-xs text-orange-600 font-[Montserrat]">
                          No: {item.removedIngredients.join(", ")}
                        </p>
                      )}
                      {item.note && (
                        <p className="text-xs text-gray-400 font-[Montserrat] italic">"{item.note}"</p>
                      )}
                      <p className="font-chewy text-[#E8192C] mt-0.5">{formatPrice(item.price)}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      data-testid={`button-remove-${item.id}`}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 h-fit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <button
                        data-testid={`button-cart-minus-${item.id}`}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-sm w-5 text-center font-[Montserrat]">{item.quantity}</span>
                      <button
                        data-testid={`button-cart-plus-${item.id}`}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-[#E8192C] text-white flex items-center justify-center hover:bg-[#c8151f] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-chewy text-gray-800 text-base">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 flex-shrink-0">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm font-[Montserrat]">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold" data-testid="text-subtotal">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-[Montserrat]">
                  <span className="text-gray-600">Delivery (est.)</span>
                  <span className="font-semibold text-[#E8192C]">from {formatPrice(DELIVERY_ZONES[0].price)}</span>
                </div>
              </div>
              <button
                onClick={() => setStep("checkout")}
                data-testid="button-proceed-checkout"
                className="w-full bg-[#E8192C] hover:bg-[#c8151f] text-white text-center font-bold py-3 px-6 rounded-xl transition-colors font-[Montserrat]"
              >
                Proceed to Checkout
              </button>
            </div>
          </>

        ) : (
          <>
            {/* Checkout Form */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-chewy text-lg text-gray-800 mb-3">Order Summary</h3>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm font-[Montserrat]">
                      <span className="text-gray-600 truncate flex-1 mr-2">
                        {item.name} ×{item.quantity}
                        {item.size && <span className="text-gray-400"> ({item.size})</span>}
                      </span>
                      <span className="font-semibold flex-shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
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

              {/* ── DELIVERY TIME SLOT ── */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">
                  Preferred Delivery Time
                </label>

                {slots.length === 0 ? (
                  <p className="text-sm text-orange-600 font-[Montserrat] bg-orange-50 rounded-xl px-4 py-3">
                    No slots available right now. Please check back during operating hours.
                  </p>
                ) : (
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      data-testid="select-delivery-time"
                      value={form.deliveryTime}
                      onChange={(e) => setForm((f) => ({ ...f, deliveryTime: e.target.value }))}
                      className={`${fieldClass} pl-9 pr-10 appearance-none`}
                    >
                      {slots.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                )}

                {/* Prep-time note */}
                <div className="mt-2 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 font-[Montserrat] leading-relaxed">
                    Orders are typically prepared within 30 minutes. The additional time covers delivery and any unexpected delays.
                  </p>
                </div>
              </div>

              {/* Delivery Zone */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-2 block">Delivery Area</label>
                <p className="text-xs text-gray-400 font-[Montserrat] mb-2">
                  Select your zone for an instant delivery cost estimate
                </p>
                <div className="relative">
                  <select
                    data-testid="select-delivery-zone"
                    value={form.deliveryZoneIndex}
                    onChange={(e) => handleZoneChange(Number(e.target.value))}
                    className={`${fieldClass} pr-10 appearance-none`}
                  >
                    {DELIVERY_ZONES.map((zone, idx) => (
                      <option key={idx} value={idx}>
                        {zone.label} — {formatPrice(zone.price)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="mt-2 flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-2">
                  <span className="text-sm font-[Montserrat] text-gray-600">Delivery fee</span>
                  <span className="font-chewy text-[#E8192C] text-lg">{formatPrice(deliveryFee)}</span>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">Full Name *</label>
                <input
                  type="text"
                  data-testid="input-checkout-name"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={fieldClass}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">Phone Number *</label>
                <input
                  type="tel"
                  data-testid="input-checkout-phone"
                  placeholder="+234 800 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={fieldClass}
                />
              </div>

              {/* Address */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">Delivery Address *</label>
                <textarea
                  data-testid="input-checkout-address"
                  placeholder="Enter your full delivery address..."
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className={`${fieldClass} resize-none`}
                  rows={3}
                />
              </div>

              {/* Special Instructions */}
              <div>
                <label className="font-chewy text-lg text-gray-800 mb-1 block">
                  Special Instructions{" "}
                  <span className="text-sm text-gray-400 font-[Montserrat] font-normal">(optional)</span>
                </label>
                <textarea
                  data-testid="input-checkout-instructions"
                  placeholder="Any other notes for your order..."
                  value={form.instructions}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  className={`${fieldClass} resize-none`}
                  rows={2}
                />
              </div>
            </div>

            {/* Checkout Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 flex-shrink-0">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm font-[Montserrat]">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-[Montserrat]">
                  <span className="text-gray-600">Delivery</span>
                  <span className="font-semibold">{formatPrice(deliveryFee)}</span>
                </div>
                {selectedSlot && (
                  <div className="flex justify-between text-sm font-[Montserrat]">
                    <span className="text-gray-600">Delivery time</span>
                    <span className="font-semibold text-gray-700">{selectedSlot.label}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                  <span className="font-chewy text-lg">Total</span>
                  <span className="font-chewy text-lg text-[#E8192C]" data-testid="text-total">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              {!canCheckout && (
                <p className="text-xs text-gray-400 font-[Montserrat] text-center mb-2">
                  Please fill in Name, Phone, and Address to continue
                </p>
              )}

              <a
                href={canCheckout ? `https://wa.me/2349056351651?text=${buildWhatsAppMessage()}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-order-now"
                onClick={canCheckout ? undefined : (e) => e.preventDefault()}
                className={`block w-full text-center font-bold py-3 px-6 rounded-xl transition-colors font-[Montserrat] ${
                  canCheckout
                    ? "bg-[#E8192C] hover:bg-[#c8151f] text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Order Now
              </a>
              <p className="text-center text-xs text-gray-400 font-[Montserrat] mt-2">
                Payment validates order. Delivery charges may vary.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
