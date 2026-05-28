import { useEffect, useState } from "react";
import { Search, RefreshCw, Eye, X } from "lucide-react";
import { supabase, DBOrder } from "@/lib/supabase";
import { formatPrice } from "@/data/menuData";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";

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

type OrderWithItems = DBOrder & {
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

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<OrderWithItems | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/orders"));
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data as OrderWithItems[]);
    } catch {
      toast.error("Failed to load orders");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to update status");
        setUpdating(null);
        return;
      }
    } catch {
      toast.error("Failed to update status");
      setUpdating(null);
      return;
    }
    setUpdating(null);

    // Update local state & selected
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: status as DBOrder["status"] } : o));
    if (selected?.id === orderId) setSelected((prev) => prev ? { ...prev, status: status as DBOrder["status"] } : null);

    toast.success(`Order marked as ${labelMap[status]}`);

    // Auto-send WhatsApp notification to customer
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
        const phone = order.customer_phone.replace(/\D/g, "");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      }
    }

    // If delivered, process referral reward
    if (status === "delivered") {
      const order = orders.find((o) => o.id === orderId);
      if (order?.referral_code_used) {
        processReferralReward(orderId, order).catch(() => {});
      }
    }
  };

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone.includes(search) ||
      o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openDetail = async (order: OrderWithItems) => {
    if (!order.order_items) {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
      setSelected({ ...order, order_items: data ?? [] });
    } else {
      setSelected(order);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Search by name, phone, order ID…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-3 py-2 pl-9 text-sm font-[Montserrat] focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-[Montserrat] focus:outline-none">
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={load} className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-2 rounded-xl text-sm font-[Montserrat]">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-[Montserrat]">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Update Status</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No orders found</td></tr>
              ) : filtered.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{o.customer_name}</p>
                    <p className="text-gray-400 text-xs">{o.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#E8192C]">{formatPrice(Number(o.total))}</td>
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
                      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}<br />
                    {new Date(o.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(o)}
                      className="text-gray-400 hover:text-[#E8192C] transition-colors p-1.5 rounded-lg hover:bg-red-50">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-chewy text-xl text-gray-800">
                Order #{selected.id.slice(0, 8).toUpperCase()}
              </h2>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Customer info */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm font-[Montserrat] space-y-1">
                <p><span className="text-gray-400">Name:</span> <strong>{selected.customer_name}</strong></p>
                <p><span className="text-gray-400">Phone:</span> <strong>{selected.customer_phone}</strong></p>
                {selected.customer_email && <p><span className="text-gray-400">Email:</span> {selected.customer_email}</p>}
                <p><span className="text-gray-400">Address:</span> {selected.delivery_address}</p>
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
                        {item.extras?.length > 0 && (
                          <p className="text-green-600 text-xs">+ {item.extras.map((e) => `${e.name} ×${e.quantity}`).join(", ")}</p>
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
                {selected.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(Number(selected.discount_amount))}</span></div>}
                {selected.referral_wallet_used > 0 && <div className="flex justify-between text-green-600"><span>Wallet used</span><span>-{formatPrice(Number(selected.referral_wallet_used))}</span></div>}
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
                  {STATUSES.filter(s => s.value !== selected.status).map((s) => (
                    <button key={s.value} onClick={() => updateStatus(selected.id, s.value)}
                      disabled={updating === selected.id}
                      className={`text-xs py-2 px-2 rounded-lg font-[Montserrat] font-semibold border transition-colors disabled:opacity-40 ${s.color} border-current`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp quick link */}
              <a
                href={`https://wa.me/${selected.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${selected.customer_name}! Your O'chel order #${selected.id.slice(0, 8).toUpperCase()} is now: *${labelMap[selected.status]}*.`)}`}
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
