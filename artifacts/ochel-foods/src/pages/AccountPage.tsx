import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User, Copy, Gift, Clock, Package, Heart, LogOut,
  ChevronRight, CheckCircle, RefreshCw, Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRewards } from "@/contexts/RewardContext";
import { supabase, DBOrder } from "@/lib/supabase";
import { formatPrice } from "@/data/menuData";
import { toast } from "sonner";

type Tab = "overview" | "orders" | "rewards" | "referral";

export default function AccountPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { referralCode, walletBalance, activeRewards, generateReferralCode, isLoading } = useRewards();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");
  type OrderWithItems = DBOrder & { order_items?: import("@/lib/supabase").DBOrderItem[] };
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user]);

  useEffect(() => {
    if (tab === "orders" && user) {
      setOrdersLoading(true);
      supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setOrders(data as OrderWithItems[]);
          setOrdersLoading(false);
        });
    }
  }, [tab, user]);

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode.code);
      toast.success("Referral code copied!");
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const code = await generateReferralCode();
    setGenerating(false);
    if (code) toast.success("Your referral code is ready!");
    else toast.error("Could not generate code. Please try again.");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const statusColor: Record<string, string> = {
    unpaid: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    preparing: "bg-orange-100 text-orange-700",
    out_for_delivery: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  const statusLabel: Record<string, string> = {
    unpaid: "Unpaid",
    confirmed: "Confirmed",
    preparing: "Preparing",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <User className="w-4 h-4" /> },
    { key: "orders", label: "Orders", icon: <Package className="w-4 h-4" /> },
    { key: "rewards", label: "Rewards", icon: <Wallet className="w-4 h-4" /> },
    { key: "referral", label: "Referral", icon: <Gift className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-chewy text-3xl text-gray-900">My Account</h1>
          <p className="text-gray-500 text-sm font-[Montserrat]">{profile?.email}</p>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 text-gray-500 hover:text-red-600 text-sm font-[Montserrat] transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {/* Wallet balance banner */}
      {walletBalance > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#E8192C] to-[#FF6B35] text-white rounded-2xl p-4 mb-6 flex items-center gap-3 shadow-lg"
        >
          <Wallet className="w-8 h-8 opacity-80 flex-shrink-0" />
          <div>
            <p className="font-chewy text-xl">You have {formatPrice(walletBalance)} in your Referral Wallet</p>
            {activeRewards.find(r => r.expires_at) && (
              <p className="text-white/80 text-xs font-[Montserrat]">
                Earliest expiry:{" "}
                {new Date(
                  activeRewards.filter(r => r.expires_at).sort(
                    (a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime()
                  )[0]?.expires_at ?? ""
                ).toLocaleDateString("en-GB")}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Tab nav — icon above label so all 4 fit on mobile */}
      <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex flex-col items-center gap-1 px-1 py-2 rounded-lg transition-all ${
              tab === t.key ? "bg-white text-[#E8192C] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.icon}
            <span className="text-[10px] font-semibold font-[Montserrat] leading-none">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-chewy text-xl text-gray-800">Profile Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm font-[Montserrat]">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Full Name</p>
                <p className="font-semibold text-gray-800">{profile?.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Email</p>
                <p className="font-semibold text-gray-800 truncate">{profile?.email}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Phone</p>
                <p className="font-semibold text-gray-800">{profile?.phone || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Member since</p>
                <p className="font-semibold text-gray-800">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <Wallet className="w-7 h-7 text-[#E8192C] mx-auto mb-1" />
              <p className="font-chewy text-2xl text-gray-900">{formatPrice(walletBalance)}</p>
              <p className="text-gray-400 text-xs font-[Montserrat]">Referral Wallet</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <Gift className="w-7 h-7 text-[#FFB800] mx-auto mb-1" />
              <p className="font-chewy text-2xl text-gray-900">{referralCode?.total_referrals ?? 0}</p>
              <p className="text-gray-400 text-xs font-[Montserrat]">Friends Referred</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── ORDERS ── */}
      {tab === "orders" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {ordersLoading ? (
            <div className="text-center py-12 text-gray-400 font-[Montserrat]">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-chewy text-xl text-gray-400">No orders yet</p>
              <p className="text-gray-400 text-sm font-[Montserrat] mt-1">Your order history will appear here</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 font-[Montserrat] text-sm">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-gray-400 text-xs font-[Montserrat]">
                      {new Date(order.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full font-[Montserrat] ${statusColor[order.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {statusLabel[order.status] ?? order.status}
                  </span>
                </div>
                {(order.order_items?.length ?? 0) > 0 && (
                  <div className="mb-2">
                    <ul className="space-y-0.5">
                      {order.order_items!.map((item) => (
                        <li key={item.id} className="text-xs font-[Montserrat] text-gray-700 flex justify-between gap-2">
                          <span className="flex-1">
                            {item.product_name}{item.size ? ` (${item.size})` : ""} ×{item.quantity}
                            {(item.extras?.length ?? 0) > 0 && (
                              <span className="text-green-600 ml-1">
                                + {item.extras!.map((e) => e.name).join(", ")}
                              </span>
                            )}
                          </span>
                          <span className="text-gray-500 flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-between text-sm font-[Montserrat] border-t border-gray-50 pt-2">
                  <span className="text-gray-500 text-xs truncate max-w-[55%]">{order.delivery_address}</span>
                  <span className="font-bold text-[#E8192C]">{formatPrice(order.total)}</span>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* ── REWARDS ── */}
      {tab === "rewards" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-chewy text-xl text-gray-800 mb-3">Your Wallet</h2>
            <div className="bg-gradient-to-r from-[#E8192C]/10 to-[#FF6B35]/10 rounded-xl p-4 mb-4">
              <p className="text-gray-500 text-xs font-[Montserrat] uppercase tracking-wide mb-1">Available Balance</p>
              <p className="font-chewy text-3xl text-[#E8192C]">{formatPrice(walletBalance)}</p>
              <p className="text-gray-400 text-xs font-[Montserrat] mt-1">
                Use at checkout — applied automatically when available
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-chewy text-lg text-gray-700">Reward History</h3>
            {isLoading ? (
              <p className="text-gray-400 text-sm font-[Montserrat]">Loading…</p>
            ) : activeRewards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <Gift className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm font-[Montserrat]">No active rewards yet</p>
              </div>
            ) : (
              activeRewards.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm font-[Montserrat] text-gray-800">{r.description}</p>
                    {r.expires_at && (
                      <p className="text-xs text-gray-400 font-[Montserrat] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Expires {new Date(r.expires_at).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                  <p className="font-chewy text-lg text-[#E8192C]">{formatPrice(r.balance)}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* ── REFERRAL ── */}
      {tab === "referral" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-chewy text-xl text-gray-800 mb-1">Share & Earn</h2>
            <p className="text-gray-500 text-sm font-[Montserrat] mb-4">
              Refer a friend. When they complete their first paid order,{" "}
              you earn a cash reward added to your Referral Wallet.
            </p>

            {referralCode ? (
              <div>
                <p className="text-xs text-gray-400 font-[Montserrat] uppercase tracking-wide mb-2">Your Referral Code</p>
                <div className="flex items-center gap-3 bg-gray-50 border-2 border-dashed border-[#E8192C]/30 rounded-xl p-4">
                  <span className="font-chewy text-3xl text-[#E8192C] tracking-widest flex-1">
                    {referralCode.code}
                  </span>
                  <button onClick={handleCopyCode}
                    className="bg-[#E8192C] text-white p-2 rounded-lg hover:bg-[#c8151f] transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="font-chewy text-2xl text-gray-800">{referralCode.total_referrals}</p>
                    <p className="text-xs text-gray-400 font-[Montserrat]">Friends referred</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="font-chewy text-2xl text-[#E8192C]">{formatPrice(referralCode.total_earned)}</p>
                    <p className="text-xs text-gray-400 font-[Montserrat]">Total earned</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Gift className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-[Montserrat] text-sm mb-4">
                  Generate your unique referral code to start earning
                </p>
                <button onClick={handleGenerate} disabled={generating}
                  className="bg-[#E8192C] text-white px-6 py-3 rounded-xl font-bold font-[Montserrat] hover:bg-[#c8151f] transition-colors disabled:opacity-60 flex items-center gap-2 mx-auto">
                  {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  {generating ? "Generating…" : "Get My Referral Code"}
                </button>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h3 className="font-chewy text-base text-amber-800 mb-2">How it works</h3>
            <ol className="space-y-2 text-sm font-[Montserrat] text-amber-700">
              <li className="flex gap-2"><span className="font-bold">1.</span> Share your code with friends</li>
              <li className="flex gap-2"><span className="font-bold">2.</span> They enter it at signup or checkout</li>
              <li className="flex gap-2"><span className="font-bold">3.</span> When their first order is delivered, you earn a cash reward</li>
              <li className="flex gap-2"><span className="font-bold">4.</span> Use your wallet balance as a discount on future orders</li>
            </ol>
          </div>
        </motion.div>
      )}
    </div>
  );
}
