import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search, RefreshCw, Eye, X, Download, Printer, Filter, Plus,
} from "lucide-react";
import { supabase, DBOrder } from "@/lib/supabase";
import { formatPrice } from "@/data/menuData";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import { useNotifications } from "@/contexts/NotificationContext";
import ManualOrderModal from "@/components/ui/ManualOrderModal";

const STATUSES = [
  { value: "unpaid",           label: "Unpaid",           color: "bg-yellow-100 text-yellow-700" },
  { value: "confirmed",        label: "Confirmed",        color: "bg-blue-100 text-blue-700" },
  { value: "preparing",        label: "Preparing",        color: "bg-orange-100 text-orange-700" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "bg-purple-100 text-purple-700" },
  { value: "delivered",        label: "Delivered",        color: "bg-green-100 text-green-700" },
  { value: "cancelled",        label: "Cancelled",        color: "bg-gray-100 text-gray-500" },
];

const colorMap = Object.fromEntries(STATUSES.map((s) => [s.value, s.color]));
const labelMap = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));

type DeliveryZoneRef = { label: string; price: number } | null;

type OrderWithItems = DBOrder & {
  delivery_zones?: DeliveryZoneRef;
  order_items?: Array<{
    id: string; product_name: string; size: string | null;
    quantity: number; price: number;
    extras: Array<{ name: string; quantity: number; price: number }> | null;
    note: string | null;
  }>;
};

async function processReferralReward(orderId: string, order: OrderWithItems) {
  if (!order.referral_code_used) return;

  const { data: refCode } = await supabase
    .from("referral_codes")
    .select("*, profiles(full_name)")
    .eq("code", order.referral_code_used)
    .single();

  if (!refCode) return;
  if (order.user_id && order.user_id === refCode.user_id) return;

  const { data: existing } = await supabase
    .from("referrals")
    .select("id")
    .eq("code", order.referral_code_used)
    .eq("status", "rewarded")
    .or(`referred_id.eq.${order.user_id ?? "null"},referred_phone.eq.${order.customer_phone}`);

  if (existing && existing.length > 0) return;

  const { data: settings } = await supabase
    .from("reward_settings")
    .select("*")
    .eq("reward_type", "cash_credit")
    .eq("is_active", true)
    .single();

  const rewardAmount = settings?.reward_value ?? 2000;
  const expiryDays = settings?.expiry_days ?? 60;
  const expiresAt = expiryDays > 0
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await supabase.from("referrals").insert({
    referrer_id: refCode.user_id,
    referred_id: order.user_id ?? null,
    referred_phone: order.customer_phone,
    code: order.referral_code_used,
    status: "rewarded",
    reward_amount: rewardAmount,
    reward_type: "cash_credit",
    order_id: orderId,
    rewarded_at: new Date().toISOString(),
  });

  await supabase.from("user_rewards").insert({
    user_id: refCode.user_id,
    reward_type: "cash_credit",
    amount: rewardAmount,
    balance: rewardAmount,
    description: `Referral reward — friend used code ${order.referral_code_used}`,
    source: "referral",
    expires_at: expiresAt,
    is_used: false,
  });

  const { data: p } = await supabase
    .from("profiles")
    .select("referral_wallet_balance")
    .eq("id", refCode.user_id)
    .single();
  if (p) {
    await supabase.from("profiles").update({
      referral_wallet_balance: Number(p.referral_wallet_balance) + rewardAmount,
    }).eq("id", refCode.user_id);
  }

  await supabase.from("referral_codes").update({
    total_referrals: refCode.total_referrals + 1,
    total_earned: Number(refCode.total_earned) + rewardAmount,
  }).eq("id", refCode.id);
}

/* ── CSV Export ── */
function exportCSV(orders: OrderWithItems[]) {
  const headers = [
    "Order ID", "Order Date", "Delivery Date", "Customer Name", "Phone", "Email",
    "Address", "Zone", "Items", "Subtotal", "Delivery Fee", "Discount", "Wallet Used",
    "Total", "Status", "Promo Code", "Referral Code", "Notes",
  ];
  const rows = orders.map((o) => [
    `#${o.id.slice(0, 8).toUpperCase()}`,
    new Date(o.created_at).toLocaleString("en-GB"),
    o.delivery_date
      ? new Date(o.delivery_date + "T12:00:00").toLocaleDateString("en-GB")
      : "",
    o.customer_name,
    o.customer_phone,
    o.customer_email || "",
    o.delivery_address,
    o.delivery_zones?.label || "",
    (o.order_items || [])
      .map((i) => `${i.product_name}${i.size ? ` (${i.size})` : ""} ×${i.quantity}`)
      .join("; "),
    Number(o.subtotal),
    Number(o.delivery_fee),
    Number(o.discount_amount),
    Number(o.referral_wallet_used),
    Number(o.total),
    labelMap[o.status] ?? o.status,
    o.promo_code || "",
    o.referral_code_used || "",
    o.special_instructions || "",
  ]);

  const csv = [headers, ...rows]
    .map((r) =>
      r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ochel-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── PDF / Print for individual order ── */
function printOrderPDF(order: OrderWithItems) {
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) {
    toast.error("Pop-up blocked. Allow pop-ups for this site to print orders.");
    return;
  }
  const itemRows = (order.order_items || [])
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">
            ${i.product_name}${i.size ? ` <span style="color:#888;font-size:12px">(${i.size})</span>` : ""}
            ${(i.extras?.length ?? 0) > 0 ? `<br/><small style="color:#22c55e">+ ${(i.extras ?? []).map((e: {name:string;quantity:number}) => `${e.name} ×${e.quantity}`).join(", ")}</small>` : ""}
            ${i.note ? `<br/><small style="color:#888;font-style:italic">"${i.note}"</small>` : ""}
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">₦${(i.price * i.quantity).toLocaleString("en-NG")}</td>
        </tr>`
    )
    .join("");

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Order #${order.id.slice(0, 8).toUpperCase()} — O'chel Foods</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 14px; color: #222; padding: 32px; max-width: 640px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #E8192C; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-size: 24px; font-weight: 900; color: #E8192C; }
    .order-id { font-family: monospace; font-size: 18px; font-weight: 700; color: #444; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .info-item label { font-size: 11px; color: #888; display: block; }
    .info-item span { font-size: 13px; font-weight: 600; color: #222; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead th { background: #f8f8f8; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
    thead th:last-child { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    .totals { border-top: 2px solid #eee; padding-top: 12px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
    .total-row.grand { font-size: 18px; font-weight: 700; color: #E8192C; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; background: #f3f4f6; color: #555; }
    .print-btn { display: block; margin: 24px auto 0; padding: 10px 32px; background: #E8192C; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
    @media print { .print-btn { display: none; } body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">O'chel Foods</div>
    <div class="order-id">#${order.id.slice(0, 8).toUpperCase()}</div>
  </div>

  <div class="section">
    <div class="section-title">Customer & Delivery</div>
    <div class="info-grid">
      <div class="info-item"><label>Customer</label><span>${order.customer_name}</span></div>
      <div class="info-item"><label>Phone</label><span>${order.customer_phone}</span></div>
      ${order.customer_email ? `<div class="info-item"><label>Email</label><span>${order.customer_email}</span></div>` : ""}
      <div class="info-item"><label>Order Date</label><span>${new Date(order.created_at).toLocaleString("en-GB")}</span></div>
      ${order.delivery_date ? `<div class="info-item"><label>Delivery Date</label><span>${new Date(order.delivery_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</span></div>` : ""}
      ${order.delivery_time ? `<div class="info-item"><label>Delivery Time</label><span>${order.delivery_time}</span></div>` : ""}
      ${order.delivery_zones?.label ? `<div class="info-item"><label>Zone</label><span>${order.delivery_zones.label}</span></div>` : ""}
      <div class="info-item" style="grid-column:1/-1"><label>Address</label><span>${order.delivery_address}</span></div>
      ${order.special_instructions ? `<div class="info-item" style="grid-column:1/-1"><label>Notes</label><span>${order.special_instructions}</span></div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Items Ordered</div>
    <table>
      <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>₦${Number(order.subtotal).toLocaleString("en-NG")}</span></div>
      <div class="total-row"><span>Delivery Fee</span><span>₦${Number(order.delivery_fee).toLocaleString("en-NG")}</span></div>
      ${Number(order.discount_amount) > 0 ? `<div class="total-row" style="color:#22c55e"><span>Discount${order.promo_code ? ` (${order.promo_code})` : ""}</span><span>-₦${Number(order.discount_amount).toLocaleString("en-NG")}</span></div>` : ""}
      ${Number(order.referral_wallet_used) > 0 ? `<div class="total-row" style="color:#22c55e"><span>Wallet Used</span><span>-₦${Number(order.referral_wallet_used).toLocaleString("en-NG")}</span></div>` : ""}
      <div class="total-row grand"><span>Total</span><span>₦${Number(order.total).toLocaleString("en-NG")}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Order Status</div>
    <span class="status-badge">${labelMap[order.status] ?? order.status}</span>
  </div>

  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

/* ── Unique delivery zones from orders list ── */
function getUniqueZones(orders: OrderWithItems[]) {
  const map = new Map<string, string>();
  orders.forEach((o) => {
    if (o.delivery_zone_id && o.delivery_zones?.label) {
      map.set(o.delivery_zone_id, o.delivery_zones.label);
    }
  });
  return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [selected, setSelected] = useState<OrderWithItems | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showManualOrder, setShowManualOrder] = useState(false);

  /* Mark all as read when admin opens this page */
  const { markAllRead } = useNotifications();
  useEffect(() => { markAllRead(); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/orders"), { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data as OrderWithItems[]);
          setLoading(false);
          return;
        }
      }
    } catch { /* fall through to Supabase */ }

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), delivery_zones(label, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setOrders(data as OrderWithItems[]);
    } catch {
      toast.error("Failed to load orders");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Supabase Realtime — live order updates ── */
  const ordersRef = useRef(orders);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as OrderWithItems;
          setOrders((prev) => {
            if (prev.find((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as DBOrder;
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
          );
          setSelected((prev) =>
            prev?.id === updated.id ? { ...prev, ...updated } : prev
          );
        }
      )
      .subscribe((status) => {
        // If CHANNEL_ERROR, realtime not enabled — manual refresh still works
        if (status === "CHANNEL_ERROR") {
          console.info("[AdminOrders] Realtime not enabled. Enable it in Supabase dashboard for live updates.");
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);

    let updated = false;
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) updated = true;
    } catch { /* fall through */ }

    if (!updated) {
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) {
        toast.error("Failed to update status");
        setUpdating(null);
        return;
      }
      updated = true;
    }

    setUpdating(null);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: status as DBOrder["status"] } : o));
    if (selected?.id === orderId) setSelected((prev) => prev ? { ...prev, status: status as DBOrder["status"] } : null);

    toast.success(`Order marked as ${labelMap[status]}`);

    /* Auto-send WhatsApp notification to customer */
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      const statusMessages: Record<string, string> = {
        confirmed:        `Hi ${order.customer_name}! ✅ Your O'chel Foods order #${orderId.slice(0, 8).toUpperCase()} has been *confirmed* and we're getting it ready for you!`,
        preparing:        `Hi ${order.customer_name}! 👨‍🍳 Your O'chel Foods order #${orderId.slice(0, 8).toUpperCase()} is now being *prepared*. Won't be long!`,
        out_for_delivery: `Hi ${order.customer_name}! 🛵 Your O'chel Foods order #${orderId.slice(0, 8).toUpperCase()} is *on its way* to you. Please be available to receive it!`,
        delivered:        `Hi ${order.customer_name}! 🎉 Your O'chel Foods order #${orderId.slice(0, 8).toUpperCase()} has been *delivered*. Enjoy your meal! Thank you for choosing O'chel Foods ❤️`,
        cancelled:        `Hi ${order.customer_name}! We're sorry, your O'chel Foods order #${orderId.slice(0, 8).toUpperCase()} has been *cancelled*. Please contact us for more info.`,
      };
      const message = statusMessages[status];
      if (message) {
        const rawPhone = order.customer_phone.replace(/\D/g, "");
        const phone = rawPhone.startsWith("0") ? "234" + rawPhone.slice(1) : rawPhone.startsWith("234") ? rawPhone : "234" + rawPhone;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      }
    }

    if (status === "delivered") {
      const order = orders.find((o) => o.id === orderId);
      if (order?.referral_code_used) {
        processReferralReward(orderId, order).catch(() => {});
      }
    }
  };

  // All unique zones found in current orders list
  const uniqueZones = getUniqueZones(orders);

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone.includes(search) ||
      o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchDate = !dateFilter || o.delivery_date === dateFilter;
    const matchZone = !zoneFilter || o.delivery_zone_id === zoneFilter;
    return matchSearch && matchStatus && matchDate && matchZone;
  });

  const openDetail = async (order: OrderWithItems) => {
    if (!order.order_items) {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
      setSelected({ ...order, order_items: data ?? [] });
    } else {
      setSelected(order);
    }
  };

  const activeFilterCount = [statusFilter !== "all", !!dateFilter, !!zoneFilter].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search + Actions bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search by name, phone, order ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-3 py-2 pl-9 text-sm font-[Montserrat] focus:outline-none"
          />
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 border-2 px-3 py-2 rounded-xl text-sm font-[Montserrat] transition-colors relative ${
            showFilters || activeFilterCount > 0
              ? "border-[#E8192C] text-[#E8192C] bg-red-50"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#E8192C] text-white text-xs font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* CSV Export */}
        <button
          onClick={() => exportCSV(filtered)}
          title="Export filtered orders as CSV"
          className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-2 rounded-xl text-sm font-[Montserrat] transition-colors"
        >
          <Download className="w-4 h-4" /> CSV
        </button>

        {/* Refresh */}
        <button
          onClick={load}
          className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-2 rounded-xl text-sm font-[Montserrat] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>

        {/* Add Manual Order */}
        <button
          onClick={() => setShowManualOrder(true)}
          className="flex items-center gap-2 bg-[#E8192C] hover:bg-[#c8151f] text-white px-4 py-2 rounded-xl text-sm font-bold font-[Montserrat] transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Order
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-4">
          {/* Status filter */}
          <div className="flex flex-col gap-1 min-w-40">
            <label className="text-xs font-semibold text-gray-500 font-[Montserrat] uppercase tracking-wide">Order Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-[Montserrat] focus:outline-none focus:border-[#E8192C]"
            >
              <option value="all">All Statuses</option>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Delivery date filter */}
          <div className="flex flex-col gap-1 min-w-40">
            <label className="text-xs font-semibold text-gray-500 font-[Montserrat] uppercase tracking-wide">Delivery Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-[Montserrat] focus:outline-none focus:border-[#E8192C]"
            />
          </div>

          {/* Zone filter */}
          {uniqueZones.length > 0 && (
            <div className="flex flex-col gap-1 min-w-40">
              <label className="text-xs font-semibold text-gray-500 font-[Montserrat] uppercase tracking-wide">Delivery Zone</label>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-[Montserrat] focus:outline-none focus:border-[#E8192C]"
              >
                <option value="">All Zones</option>
                {uniqueZones.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </div>
          )}

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <div className="flex flex-col justify-end">
              <button
                onClick={() => { setStatusFilter("all"); setDateFilter(""); setZoneFilter(""); }}
                className="text-xs text-[#E8192C] font-semibold font-[Montserrat] px-3 py-2 rounded-xl hover:bg-red-50 border border-[#E8192C] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-[Montserrat]">
          Showing <strong className="text-gray-700">{filtered.length}</strong> of {orders.length} orders
        </p>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <p className="text-xs text-gray-400 font-[Montserrat]">Live</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-[Montserrat]">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Zone</th>
                <th className="px-4 py-3 font-semibold">Delivery Date</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Update</th>
                <th className="px-4 py-3 font-semibold">Ordered</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">No orders found</td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td
                      className="px-4 py-3 font-mono text-xs text-[#E8192C] cursor-pointer hover:underline"
                      onClick={() => openDetail(o)}
                    >
                      #{o.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{o.customer_name}</p>
                      <p className="text-gray-400 text-xs">{o.customer_phone}</p>
                      {(o.order_items?.length ?? 0) > 0 && (
                        <p className="text-gray-500 text-xs mt-0.5 leading-snug max-w-[180px]">
                          {o.order_items!.map((i) => `${i.product_name}${i.size ? ` (${i.size})` : ""} ×${i.quantity}`).join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {o.delivery_zones?.label || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {o.delivery_date ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-semibold">
                          {new Date(o.delivery_date + "T12:00:00").toLocaleDateString("en-GB", {
                            day: "numeric", month: "short",
                          })}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold text-[#E8192C] cursor-pointer hover:underline"
                      onClick={() => openDetail(o)}
                    >
                      {formatPrice(Number(o.total))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorMap[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {labelMap[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={o.status}
                        disabled={updating === o.id || o.status === "delivered" || o.status === "cancelled"}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-[Montserrat] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      <br />
                      {new Date(o.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openDetail(o)}
                          title="View order details"
                          className="text-gray-400 hover:text-[#E8192C] transition-colors p-1.5 rounded-lg hover:bg-red-50"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => printOrderPDF(o)}
                          title="Print / Export PDF"
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual order modal */}
      {showManualOrder && (
        <ManualOrderModal
          onClose={() => setShowManualOrder(false)}
          onOrderCreated={(newOrder) => {
            setOrders((prev) => {
              if (prev.find((o) => o.id === (newOrder as OrderWithItems).id)) return prev;
              return [newOrder as OrderWithItems, ...prev];
            });
          }}
        />
      )}

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-chewy text-xl text-gray-800">
                Order #{selected.id.slice(0, 8).toUpperCase()}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printOrderPDF(selected)}
                  title="Print / Export PDF"
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setSelected(null)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Customer info */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm font-[Montserrat] space-y-1">
                <p><span className="text-gray-400">Name:</span> <strong>{selected.customer_name}</strong></p>
                <p><span className="text-gray-400">Phone:</span> <strong>{selected.customer_phone}</strong></p>
                {selected.customer_email && <p><span className="text-gray-400">Email:</span> {selected.customer_email}</p>}
                <p><span className="text-gray-400">Address:</span> {selected.delivery_address}</p>
                {selected.delivery_zones?.label && (
                  <p><span className="text-gray-400">Zone:</span> {selected.delivery_zones.label}</p>
                )}
                {selected.delivery_date && (
                  <p>
                    <span className="text-gray-400">Delivery Date:</span>{" "}
                    <strong className="text-blue-700">
                      {new Date(selected.delivery_date + "T12:00:00").toLocaleDateString("en-GB", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })}
                    </strong>
                  </p>
                )}
                {selected.delivery_time && <p><span className="text-gray-400">Delivery time:</span> {selected.delivery_time}</p>}
                {selected.special_instructions && <p><span className="text-gray-400">Notes:</span> {selected.special_instructions}</p>}
              </div>

              {/* Items */}
              <div>
                <h3 className="font-chewy text-base text-gray-700 mb-2">Items Ordered</h3>
                <div className="space-y-2">
                  {(selected.order_items || []).map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm font-[Montserrat] border-b border-gray-50 pb-2">
                      <div>
                        <p className="font-semibold text-gray-800">{item.product_name} ×{item.quantity}</p>
                        {item.size && <p className="text-gray-400 text-xs">{item.size}</p>}
                        {(item.extras?.length ?? 0) > 0 && (
                          <p className="text-green-600 text-xs">
                            + {(item.extras ?? []).map((e) => `${e.name} ×${e.quantity}`).join(", ")}
                          </p>
                        )}
                        {item.note && <p className="text-gray-400 text-xs italic">"{item.note}"</p>}
                      </div>
                      <p className="font-semibold text-[#E8192C]">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm font-[Montserrat] space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(Number(selected.subtotal))}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivery fee</span><span>{formatPrice(Number(selected.delivery_fee))}</span></div>
                {selected.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount{selected.promo_code ? ` (${selected.promo_code})` : ""}</span>
                    <span>-{formatPrice(Number(selected.discount_amount))}</span>
                  </div>
                )}
                {selected.referral_wallet_used > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Wallet used</span><span>-{formatPrice(Number(selected.referral_wallet_used))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#E8192C] text-base border-t border-gray-200 pt-2 mt-2">
                  <span>Total</span><span>{formatPrice(Number(selected.total))}</span>
                </div>
              </div>

              {/* Status update */}
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-2">
                  Update Status
                  <span className="text-gray-400 font-normal ml-1">(triggers WhatsApp notification)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.filter((s) => s.value !== selected.status).map((s) => (
                    <button
                      key={s.value}
                      onClick={() => updateStatus(selected.id, s.value)}
                      disabled={updating === selected.id}
                      className={`text-xs py-2 px-2 rounded-lg font-[Montserrat] font-semibold border transition-colors disabled:opacity-40 ${s.color} border-current`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp quick link */}
              <a
                href={`https://wa.me/${(([r]) => r.startsWith("0") ? "234" + r.slice(1) : r.startsWith("234") ? r : "234" + r)([selected.customer_phone.replace(/\D/g, "")])}?text=${encodeURIComponent(
                  `Hi ${selected.customer_name}! Your O'chel order #${selected.id.slice(0, 8).toUpperCase()} is now: *${labelMap[selected.status]}*.`
                )}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-bold font-[Montserrat] text-sm transition-colors"
              >
                Send WhatsApp Update
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
