import { useState, useEffect, useMemo } from "react";
import {
  X, Plus, Minus, Trash2, ShoppingBag, User, Phone,
  Calendar, Store, Bike, Check, Search, ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useMenuData } from "@/hooks/useMenuData";
import {
  formatPrice, comboDealProducts, type ComboProduct,
} from "@/data/menuData";
import { toast } from "sonner";

/* ── Types ─────────────────────────────────────────────────────── */

type DeliveryZoneDB = { id: string; label: string; price: number };

type ManualCartItem = {
  id: string;
  productId: string | null;
  name: string;
  category: string;
  size?: string;
  price: number; // per-unit, all-in (base + size + extras)
  quantity: number;
  extras?: { name: string; price: number; quantity: number }[];
  note?: string;
};

type ProductPicker = {
  productId: string;
  name: string;
  category: string;
  basePrice: number;
  sizes?: { label: string; price: number }[];
  extras?: { name: string; price: number }[];
  selectedSize?: string;
  selectedSizePrice: number;
  selectedExtras: Record<string, number>; // name → quantity
  quantity: number;
  note: string;
};

type DBCombo = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  combo_price: number;
  original_price: number;
  is_active: boolean;
};

const STATUSES = [
  { value: "unpaid",           label: "Unpaid" },
  { value: "confirmed",        label: "Confirmed" },
  { value: "preparing",        label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered",        label: "Delivered" },
  { value: "cancelled",        label: "Cancelled" },
];

const STORE_ADDRESS = "4 Houses After The Poly, Parakin, Ile-Ife, Osun State";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

/* ── Props ─────────────────────────────────────────────────────── */
interface Props {
  onClose: () => void;
  onOrderCreated: (order: unknown) => void;
}

/* ══════════════════════════════════════════════════════════════════
   ManualOrderModal
══════════════════════════════════════════════════════════════════ */
export default function ManualOrderModal({ onClose, onOrderCreated }: Props) {
  const { products, categories, loading: menuLoading } = useMenuData();

  /* ── Product browser ── */
  const [selectedCategory, setSelectedCategory] = useState<string>("pizza");
  const [productSearch, setProductSearch] = useState("");
  const [picker, setPicker] = useState<ProductPicker | null>(null);

  /* ── Combo deals (DB + static fallback) ── */
  const [combos, setCombos] = useState<ComboProduct[]>(comboDealProducts);

  /* ── Cart ── */
  const [cartItems, setCartItems] = useState<ManualCartItem[]>([]);

  /* ── Delivery zones ── */
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZoneDB[]>([]);

  /* ── Order form ── */
  const [isPickup, setIsPickup] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const todayStr = toDateStr(new Date());
  const maxDateStr = toDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [deliveryDate, setDeliveryDate] = useState(todayStr);
  const [deliveryTime, setDeliveryTime] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [orderStatus, setOrderStatus] = useState("confirmed");

  /* ── UI state ── */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch delivery zones + combos on mount ── */
  useEffect(() => {
    supabase
      .from("delivery_zones")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data?.length) setDeliveryZones(data as DeliveryZoneDB[]);
      });

    supabase
      .from("combos")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCombos(
            (data as DBCombo[]).map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description ?? "",
              imageUrl: c.image_url ?? "",
              comboPrice: c.combo_price,
              originalPrice: c.original_price ?? c.combo_price,
              includes: [],
            }))
          );
        }
      });
  }, []);

  /* ── Set initial category once products load ── */
  useEffect(() => {
    if (!menuLoading && products.length > 0) {
      const firstSlug = products[0].category;
      setSelectedCategory(firstSlug);
    }
  }, [menuLoading, products]);

  /* ── Derived ── */
  const subtotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const total = subtotal + (isPickup ? 0 : deliveryFee);

  /* Ordered unique category slugs from live products */
  const categorySlugs = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of products) {
      if (!seen.has(p.category)) { seen.add(p.category); out.push(p.category); }
    }
    return out;
  }, [products]);

  const getCategoryLabel = (slug: string) => {
    const cat = categories.find(
      (c) => c.slug === `/${slug}` || c.slug === slug || c.id === slug
    );
    if (cat) return cat.name;
    return slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "combos") return [];
    const base = products.filter((p) => p.category === selectedCategory);
    if (!productSearch.trim()) return base;
    return base.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, selectedCategory, productSearch]);

  const filteredCombos = useMemo(() => {
    if (selectedCategory !== "combos") return [];
    if (!productSearch.trim()) return combos;
    return combos.filter((c) => c.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [combos, selectedCategory, productSearch]);

  /* ── Product picker helpers ── */
  const openPicker = (p: (typeof products)[0]) => {
    if (picker?.productId === p.id) { setPicker(null); return; }
    setPicker({
      productId: p.id,
      name: p.name,
      category: p.category,
      basePrice: p.basePrice,
      sizes: p.sizes?.map((s) => ({ label: s.label, price: s.price })),
      extras: p.extras,
      selectedSize: p.sizes?.[0]?.label,
      selectedSizePrice: p.sizes?.[0]?.price ?? p.basePrice,
      selectedExtras: {},
      quantity: 1,
      note: "",
    });
  };

  const pickerPrice = useMemo(() => {
    if (!picker) return 0;
    const base = picker.sizes ? picker.selectedSizePrice : picker.basePrice;
    const extrasTotal = Object.entries(picker.selectedExtras).reduce((acc, [name, qty]) => {
      const ex = picker.extras?.find((e) => e.name === name);
      return acc + (ex?.price ?? 0) * qty;
    }, 0);
    return base + extrasTotal;
  }, [picker]);

  const addFromPicker = () => {
    if (!picker) return;
    const extras = Object.entries(picker.selectedExtras)
      .filter(([, qty]) => qty > 0)
      .map(([name, qty]) => {
        const ex = picker.extras?.find((e) => e.name === name);
        return { name, price: ex?.price ?? 0, quantity: qty };
      });

    const item: ManualCartItem = {
      id: crypto.randomUUID(),
      productId: picker.productId,
      name: picker.name,
      category: picker.category,
      size: picker.selectedSize,
      price: pickerPrice,
      quantity: picker.quantity,
      extras: extras.length > 0 ? extras : undefined,
      note: picker.note || undefined,
    };
    setCartItems((prev) => [...prev, item]);
    setPicker(null);
    toast.success(`${picker.name} added`);
  };

  const addCombo = (combo: ComboProduct) => {
    setCartItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: combo.id,
        name: combo.name,
        category: "combos",
        price: combo.comboPrice,
        quantity: 1,
      },
    ]);
    toast.success(`${combo.name} added`);
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) removeFromCart(id);
    else setCartItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
  };
  const removeFromCart = (id: string) => setCartItems((prev) => prev.filter((i) => i.id !== id));

  const handleZoneChange = (id: string) => {
    const zone = deliveryZones.find((z) => z.id === id);
    setDeliveryZoneId(id);
    setDeliveryFee(zone?.price ?? 0);
  };

  /* ── Validation ── */
  const canSave =
    cartItems.length > 0 &&
    customerName.trim() &&
    customerPhone.trim() &&
    (isPickup || (address.trim() && deliveryZoneId));

  /* ── Save ── */
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    const orderPayload = {
      user_id: null,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: customerEmail.trim() || null,
      delivery_address: isPickup ? `PICK UP: ${STORE_ADDRESS}` : address.trim(),
      delivery_zone_id: isPickup ? null : (deliveryZoneId || null),
      delivery_fee: isPickup ? 0 : deliveryFee,
      subtotal,
      total,
      discount_amount: 0,
      referral_wallet_used: 0,
      promo_code: null,
      delivery_time: deliveryTime || null,
      delivery_date: deliveryDate || null,
      special_instructions: specialInstructions.trim() || null,
      referral_code_used: null,
    };

    const itemsPayload = cartItems.map((i) => ({
      productId: i.productId || null,
      name: i.name,
      size: i.size || null,
      price: i.price,
      quantity: i.quantity,
      extras: i.extras || null,
      removedIngredients: null,
      note: i.note || null,
    }));

    const newOrderId = crypto.randomUUID();
    const { error: orderErr } = await supabase
      .from("orders")
      .insert({ id: newOrderId, ...orderPayload, status: "unpaid" });

    if (orderErr) {
      setError("Failed to save order. Please try again.");
      setSaving(false);
      return;
    }

    if (cartItems.length) {
      const { error: itemsErr } = await supabase.from("order_items").insert(
        cartItems.map((i) => ({
          order_id: newOrderId,
          product_id: i.productId || null,
          product_name: i.name,
          size: i.size || null,
          price: i.price,
          quantity: i.quantity,
          extras: i.extras || null,
          removed_ingredients: null,
          note: i.note || null,
        }))
      );
      if (itemsErr) toast.error("Order saved but items failed to attach — please check it in Orders.");
    }

    /* Update status if not "unpaid" */
    if (orderStatus !== "unpaid") {
      await supabase
        .from("orders")
        .update({ status: orderStatus, updated_at: new Date().toISOString() })
        .eq("id", newOrderId);
    }

    /* Fetch the fully-hydrated order to hand back to the orders list */
    const { data: createdOrder } = await supabase
      .from("orders")
      .select("*, order_items(*), delivery_zones(label, price)")
      .eq("id", newOrderId)
      .single();

    toast.success("Manual order saved!");
    onOrderCreated(
      createdOrder ?? {
        id: newOrderId,
        ...orderPayload,
        status: orderStatus,
        created_at: new Date().toISOString(),
        order_items: cartItems,
      }
    );
    onClose();
    setSaving(false);
  };

  /* ════════════════════════════════════════════════════════════════
     Render
  ════════════════════════════════════════════════════════════════ */
  const inputClass =
    "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-3 py-2.5 text-sm font-[Montserrat] focus:outline-none";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col"
        style={{ height: "min(95vh, 900px)" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="font-chewy text-2xl text-gray-800">New Manual Order</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ══ LEFT: Product Browser ═════════════════════════════ */}
          <div className="flex flex-col w-[58%] border-r min-h-0">

            {/* Search */}
            <div className="px-4 pt-3 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  placeholder="Search products…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-3 py-2 pl-9 text-sm font-[Montserrat] focus:outline-none"
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="px-4 pb-2 flex-shrink-0">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {categorySlugs.map((slug) => (
                  <button
                    key={slug}
                    onClick={() => { setSelectedCategory(slug); setPicker(null); }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold font-[Montserrat] transition-colors ${
                      selectedCategory === slug
                        ? "bg-[#E8192C] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {getCategoryLabel(slug)}
                  </button>
                ))}
                <button
                  onClick={() => { setSelectedCategory("combos"); setPicker(null); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold font-[Montserrat] transition-colors ${
                    selectedCategory === "combos"
                      ? "bg-[#E8192C] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Combo Deals
                </button>
              </div>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
              {menuLoading ? (
                <p className="text-center text-gray-400 py-8 font-[Montserrat] text-sm">Loading menu…</p>
              ) : selectedCategory === "combos" ? (
                filteredCombos.map((combo) => (
                  <div
                    key={combo.id}
                    className="border border-gray-100 rounded-xl p-3 hover:border-[#E8192C]/30 hover:bg-red-50/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 font-[Montserrat] truncate">{combo.name}</p>
                        {combo.description && (
                          <p className="text-xs text-gray-400 font-[Montserrat] truncate">{combo.description}</p>
                        )}
                        <p className="font-chewy text-[#E8192C] text-base mt-0.5">{formatPrice(combo.comboPrice)}</p>
                      </div>
                      <button
                        onClick={() => addCombo(combo)}
                        className="flex-shrink-0 bg-[#E8192C] hover:bg-[#c8151f] text-white text-xs font-bold px-3 py-1.5 rounded-lg font-[Montserrat] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  </div>
                ))
              ) : filteredProducts.length === 0 ? (
                <p className="text-center text-gray-400 py-8 font-[Montserrat] text-sm">No products found</p>
              ) : (
                filteredProducts.map((product) => {
                  const isOpen = picker?.productId === product.id;
                  return (
                    <div
                      key={product.id}
                      className={`border rounded-xl transition-colors ${
                        isOpen ? "border-[#E8192C]/40 bg-red-50/20" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {/* Product row */}
                      <div
                        className="p-3 flex items-center justify-between gap-3 cursor-pointer"
                        onClick={() => openPicker(product)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-gray-800 font-[Montserrat]">{product.name}</p>
                            {product.tag && (
                              <span className="text-[10px] bg-[#FFB800] text-black px-1.5 py-0.5 rounded font-bold font-[Montserrat]">
                                {product.tag}
                              </span>
                            )}
                          </div>
                          <p className="font-chewy text-[#E8192C] text-base">{formatPrice(product.basePrice)}</p>
                          {product.sizes && (
                            <p className="text-xs text-gray-400 font-[Montserrat]">
                              {product.sizes.map((s) => s.label).join(" · ")}
                            </p>
                          )}
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </div>

                      {/* Inline picker */}
                      {isOpen && picker && (
                        <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
                          {/* Sizes */}
                          {picker.sizes && picker.sizes.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold font-[Montserrat] text-gray-500 mb-1.5 uppercase tracking-wide">
                                Size
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {picker.sizes.map((s) => (
                                  <button
                                    key={s.label}
                                    onClick={() =>
                                      setPicker((p) =>
                                        p ? { ...p, selectedSize: s.label, selectedSizePrice: s.price } : null
                                      )
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-[Montserrat] border-2 transition-colors ${
                                      picker.selectedSize === s.label
                                        ? "border-[#E8192C] bg-[#E8192C] text-white"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                    }`}
                                  >
                                    {s.label} — {formatPrice(s.price)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Extras */}
                          {picker.extras && picker.extras.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold font-[Montserrat] text-gray-500 mb-1.5 uppercase tracking-wide">
                                Extras
                              </p>
                              <div className="space-y-1.5">
                                {picker.extras.map((ex) => {
                                  const qty = picker.selectedExtras[ex.name] ?? 0;
                                  return (
                                    <div
                                      key={ex.name}
                                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                                    >
                                      <span className="text-sm font-[Montserrat] text-gray-700">
                                        {ex.name}{" "}
                                        <span className="text-gray-400 text-xs">+{formatPrice(ex.price)}</span>
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() =>
                                            setPicker((p) =>
                                              p
                                                ? {
                                                    ...p,
                                                    selectedExtras: {
                                                      ...p.selectedExtras,
                                                      [ex.name]: Math.max(0, qty - 1),
                                                    },
                                                  }
                                                : null
                                            )
                                          }
                                          className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-4 text-center text-sm font-bold font-[Montserrat]">{qty}</span>
                                        <button
                                          onClick={() =>
                                            setPicker((p) =>
                                              p
                                                ? {
                                                    ...p,
                                                    selectedExtras: {
                                                      ...p.selectedExtras,
                                                      [ex.name]: qty + 1,
                                                    },
                                                  }
                                                : null
                                            )
                                          }
                                          className="w-6 h-6 rounded-full bg-[#E8192C] text-white flex items-center justify-center hover:bg-[#c8151f]"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Note */}
                          <input
                            placeholder="Item note (optional)"
                            value={picker.note}
                            onChange={(e) =>
                              setPicker((p) => (p ? { ...p, note: e.target.value } : null))
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-[Montserrat] focus:outline-none focus:border-[#E8192C]"
                          />

                          {/* Qty + Add button */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setPicker((p) =>
                                    p ? { ...p, quantity: Math.max(1, p.quantity - 1) } : null
                                  )
                                }
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-bold text-base w-6 text-center font-[Montserrat]">
                                {picker.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  setPicker((p) =>
                                    p ? { ...p, quantity: p.quantity + 1 } : null
                                  )
                                }
                                className="w-8 h-8 rounded-full bg-[#E8192C] text-white flex items-center justify-center hover:bg-[#c8151f]"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button
                              onClick={addFromPicker}
                              className="bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold text-sm px-4 py-2 rounded-xl font-[Montserrat] flex items-center gap-1.5 transition-colors"
                            >
                              <Plus className="w-4 h-4" /> Add — {formatPrice(pickerPrice * picker.quantity)}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ══ RIGHT: Order Form ═════════════════════════════════ */}
          <div className="flex flex-col w-[42%] min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {/* Cart */}
              <div>
                <h3 className="font-chewy text-base text-gray-700 mb-2 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Cart
                  {cartItems.length > 0 && (
                    <span className="bg-[#E8192C] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center font-[Montserrat]">
                      {cartItems.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </h3>

                {cartItems.length === 0 ? (
                  <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm font-[Montserrat]">
                    No items yet — browse the menu on the left
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {cartItems.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-xl p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-800 font-[Montserrat] leading-tight truncate">
                              {item.name}
                            </p>
                            {item.size && (
                              <p className="text-xs text-gray-400 font-[Montserrat]">{item.size}</p>
                            )}
                            {(item.extras?.length ?? 0) > 0 && (
                              <p className="text-xs text-green-600 font-[Montserrat]">
                                +{" "}
                                {item.extras!.map((e) =>
                                  `${e.name}${e.quantity > 1 ? ` ×${e.quantity}` : ""}`
                                ).join(", ")}
                              </p>
                            )}
                            {item.note && (
                              <p className="text-xs text-gray-400 font-[Montserrat] italic">"{item.note}"</p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateQty(item.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="font-bold text-xs w-4 text-center font-[Montserrat]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-full bg-[#E8192C] text-white flex items-center justify-center hover:bg-[#c8151f]"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <span className="font-chewy text-sm text-[#E8192C]">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer details */}
              <div className="space-y-2.5">
                <h3 className="font-chewy text-base text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" /> Customer Details
                </h3>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Order type */}
              <div>
                <h3 className="font-chewy text-base text-gray-700 mb-2">Order Type</h3>
                <div className="flex rounded-xl overflow-hidden border-2 border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsPickup(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold font-[Montserrat] transition-colors ${
                      !isPickup ? "bg-[#E8192C] text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Bike className="w-4 h-4" /> Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsPickup(true); setDeliveryZoneId(""); setDeliveryFee(0); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold font-[Montserrat] transition-colors border-l-2 border-gray-200 ${
                      isPickup ? "bg-[#E8192C] text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Store className="w-4 h-4" /> Pick Up
                  </button>
                </div>
              </div>

              {/* Delivery fields */}
              {!isPickup && (
                <div className="space-y-2.5">
                  <textarea
                    placeholder="Delivery Address *"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                  <select
                    value={deliveryZoneId}
                    onChange={(e) => handleZoneChange(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Delivery Zone *</option>
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.label} — {formatPrice(z.price)}
                      </option>
                    ))}
                  </select>
                  {deliveryZoneId && (
                    <div className="flex justify-between items-center bg-red-50 rounded-xl px-3 py-2 text-sm font-[Montserrat]">
                      <span className="text-gray-500">Delivery Fee</span>
                      <span className="font-chewy text-[#E8192C] text-base">{formatPrice(deliveryFee)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Date & Time */}
              <div className="space-y-2.5">
                <h3 className="font-chewy text-base text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Delivery Date & Time
                </h3>
                <input
                  type="date"
                  min={todayStr}
                  max={maxDateStr}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Time — e.g. 2:00 PM (optional)"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Special instructions */}
              <div>
                <h3 className="font-chewy text-base text-gray-700 mb-1.5">Special Instructions</h3>
                <textarea
                  placeholder="Notes (optional)"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Order status */}
              <div>
                <h3 className="font-chewy text-base text-gray-700 mb-1.5">Initial Order Status</h3>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className={inputClass}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Totals */}
              {cartItems.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm font-[Montserrat]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold">{formatPrice(subtotal)}</span>
                  </div>
                  {!isPickup && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery</span>
                      <span className="font-semibold">{formatPrice(deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#E8192C] border-t border-gray-200 pt-1.5 mt-1">
                    <span>Total</span>
                    <span className="font-chewy text-lg">{formatPrice(total)}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-[Montserrat]">
                  {error}
                </div>
              )}
            </div>

            {/* ── Footer: Save button ── */}
            <div className="border-t px-4 py-3 flex-shrink-0">
              {!canSave && cartItems.length > 0 && (
                <p className="text-xs text-gray-400 font-[Montserrat] text-center mb-2">
                  {!customerName.trim() || !customerPhone.trim()
                    ? "Fill in customer name & phone to save"
                    : !isPickup && !address.trim()
                    ? "Fill in delivery address"
                    : !isPickup && !deliveryZoneId
                    ? "Select a delivery zone"
                    : ""}
                </p>
              )}
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className={`w-full py-3 rounded-xl font-bold font-[Montserrat] text-sm flex items-center justify-center gap-2 transition-colors ${
                  canSave && !saving
                    ? "bg-[#E8192C] hover:bg-[#c8151f] text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Order
                    {cartItems.length > 0 ? ` — ${formatPrice(total)}` : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
