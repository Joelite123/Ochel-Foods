import { useEffect, useState } from "react";
import { Search, Eye, X, Wallet, Gift } from "lucide-react";
import { supabase, Profile, DBOrder } from "@/lib/supabase";
import { formatPrice } from "@/data/menuData";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";

type CustomerData = Profile & {
  orderCount?: number;
  totalSpent?: number;
  referralCode?: string;
  referralCount?: number;
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomerData | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<DBOrder[]>([]);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const load = async () => {
    setLoading(true);

    // Try API server first (service-role key, bypasses RLS)
    try {
      const res = await fetch(apiUrl("/api/customers"), { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCustomers(data as CustomerData[]);
          setLoading(false);
          return;
        }
      }
    } catch { /* API unreachable — fall through */ }

    // Fallback: direct Supabase (requires admin SELECT policy on profiles)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "customer")
      .order("created_at", { ascending: false });

    if (!profiles) { setLoading(false); return; }

    const enriched: CustomerData[] = await Promise.all(
      (profiles as Profile[]).map(async (p) => {
        const [{ data: orders }, { data: ref }] = await Promise.all([
          supabase.from("orders").select("total").eq("user_id", p.id),
          supabase.from("referral_codes").select("code, total_referrals").eq("user_id", p.id).single(),
        ]);
        return {
          ...p,
          orderCount: orders?.length ?? 0,
          totalSpent: orders?.reduce((s, o) => s + Number(o.total), 0) ?? 0,
          referralCode: ref?.code,
          referralCount: ref?.total_referrals ?? 0,
        };
      })
    );
    setCustomers(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCustomer = async (c: CustomerData) => {
    setSelected(c);
    // Try API first, fall back to Supabase
    try {
      const res = await fetch(apiUrl(`/api/customers/${c.id}/orders`), { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) { setSelectedOrders(data as DBOrder[]); return; }
      }
    } catch { /* fall through */ }
    const { data } = await supabase.from("orders").select("*").eq("user_id", c.id).order("created_at", { ascending: false }).limit(10);
    setSelectedOrders((data as DBOrder[]) || []);
  };

  const handleAdjustWallet = async () => {
    if (!selected || !adjustAmount) return;
    const amount = Number(adjustAmount);
    if (isNaN(amount)) return toast.error("Enter a valid amount");
    setAdjusting(true);

    if (amount > 0) {
      // Add credit
      await supabase.from("user_rewards").insert({
        user_id: selected.id,
        reward_type: "cash_credit",
        amount: Math.abs(amount),
        balance: Math.abs(amount),
        description: adjustNote || "Manual admin credit",
        source: "admin",
        expires_at: null,
      });
      await supabase.from("profiles").update({
        referral_wallet_balance: selected.referral_wallet_balance + Math.abs(amount),
      }).eq("id", selected.id);
    } else {
      // Deduct from profile balance
      const newBalance = Math.max(0, selected.referral_wallet_balance + amount);
      await supabase.from("profiles").update({ referral_wallet_balance: newBalance }).eq("id", selected.id);
    }

    toast.success("Wallet adjusted");
    setAdjustAmount("");
    setAdjustNote("");
    setAdjusting(false);
    load();
    setSelected(null);
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    return (
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    );
  });

  const statusLabel: Record<string, string> = {
    unpaid: "Unpaid", confirmed: "Confirmed", preparing: "Preparing",
    out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Search by name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl pl-9 pr-4 py-2 text-sm font-[Montserrat] focus:outline-none" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-[Montserrat]">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Orders</th>
                <th className="px-4 py-3 font-semibold">Total Spent</th>
                <th className="px-4 py-3 font-semibold">Wallet</th>
                <th className="px-4 py-3 font-semibold">Referral Code</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No customers found</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{c.full_name || "—"}</p>
                    <p className="text-gray-400 text-xs">{c.email}</p>
                    {c.phone && <p className="text-gray-400 text-xs">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{c.orderCount}</td>
                  <td className="px-4 py-3 text-[#E8192C] font-semibold">{formatPrice(c.totalSpent ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${c.referral_wallet_balance > 0 ? "text-green-600" : "text-gray-400"}`}>
                      {formatPrice(c.referral_wallet_balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {c.referralCode ? (
                      <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                        {c.referralCode}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openCustomer(c)}
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

      {/* Customer detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-chewy text-xl text-gray-800">{selected.full_name || selected.email}</h2>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="font-chewy text-xl text-gray-800">{selected.orderCount}</p>
                  <p className="text-xs text-gray-400 font-[Montserrat]">Orders</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="font-chewy text-base text-[#E8192C]">{formatPrice(selected.totalSpent ?? 0)}</p>
                  <p className="text-xs text-gray-400 font-[Montserrat]">Spent</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="font-chewy text-base text-green-600">{formatPrice(selected.referral_wallet_balance)}</p>
                  <p className="text-xs text-gray-400 font-[Montserrat]">Wallet</p>
                </div>
              </div>

              {/* Wallet adjustment */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-blue-800 text-sm font-[Montserrat] flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Adjust Wallet Balance
                </h3>
                <p className="text-xs text-blue-600 font-[Montserrat]">
                  Enter a positive amount to add credit, or negative to deduct (e.g. -500).
                </p>
                <div className="flex gap-2">
                  <input type="number" placeholder="Amount (e.g. 2000 or -500)" value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="flex-1 border border-blue-200 rounded-lg px-3 py-1.5 text-sm font-[Montserrat] focus:outline-none focus:border-blue-400" />
                  <button onClick={handleAdjustWallet} disabled={adjusting}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-[Montserrat] font-semibold hover:bg-blue-700 disabled:opacity-60">
                    {adjusting ? "…" : "Apply"}
                  </button>
                </div>
                <input placeholder="Note (optional)" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg px-3 py-1.5 text-xs font-[Montserrat] focus:outline-none focus:border-blue-400" />
              </div>

              {/* Referral info */}
              {selected.referralCode && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center justify-between text-sm font-[Montserrat]">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-700 font-semibold">Referral Code:</span>
                    <span className="font-mono font-bold tracking-widest">{selected.referralCode}</span>
                  </div>
                  <span className="text-amber-600">{selected.referralCount} referred</span>
                </div>
              )}

              {/* Recent orders */}
              <div>
                <h3 className="font-chewy text-base text-gray-700 mb-2">Recent Orders</h3>
                {selectedOrders.length === 0 ? (
                  <p className="text-gray-400 text-xs font-[Montserrat]">No orders yet</p>
                ) : (
                  <div className="space-y-2">
                    {selectedOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-sm font-[Montserrat] bg-gray-50 rounded-xl px-3 py-2">
                        <div>
                          <p className="font-mono text-xs text-gray-500">#{o.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString("en-GB")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#E8192C]">{formatPrice(Number(o.total))}</p>
                          <p className="text-xs text-gray-400">{statusLabel[o.status] ?? o.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
