import { useEffect, useState } from "react";
import { RefreshCw, Check, X, Eye, Settings, Wallet, AlertTriangle } from "lucide-react";
import { supabase, DBReferral, DBUserReward, DBRewardSetting } from "@/lib/supabase";
import { getRewardSettings, invalidateRewardSettingsCache } from "@/lib/rewardSettingsCache";
import { formatPrice } from "@/data/menuData";
import { toast } from "sonner";

type Tab = "referrals" | "transactions" | "settings" | "abuse";

export default function AdminReferrals() {
  const [tab, setTab] = useState<Tab>("referrals");
  const [referrals, setReferrals] = useState<(DBReferral & { referrer_name?: string; referred_name?: string })[]>([]);
  const [transactions, setTransactions] = useState<(DBUserReward & { user_email?: string })[]>([]);
  const [settings, setSettings] = useState<DBRewardSetting | null>(null);
  const [abuseLog, setAbuseLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsForm, setSettingsForm] = useState({ reward_value: 2000, expiry_days: 60, reward_type: "cash_credit", is_active: true, description: "" });
  const [savingSettings, setSavingSettings] = useState(false);

  const loadReferrals = async () => {
    setLoading(true);
    const { data } = await supabase.from("referrals").select("*").order("created_at", { ascending: false });
    if (data) {
      // Enrich with profile names
      const enriched = await Promise.all((data as DBReferral[]).map(async (r) => {
        const [{ data: ref }, { data: rfd }] = await Promise.all([
          supabase.from("profiles").select("full_name, email").eq("id", r.referrer_id).single(),
          r.referred_id ? supabase.from("profiles").select("full_name, email").eq("id", r.referred_id).single() : { data: null },
        ]);
        return { ...r, referrer_name: ref?.full_name || ref?.email, referred_name: rfd?.full_name || rfd?.email };
      }));
      setReferrals(enriched);
    }
    setLoading(false);
  };

  const loadTransactions = async () => {
    const { data } = await supabase.from("user_rewards").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) {
      const enriched = await Promise.all((data as DBUserReward[]).map(async (t) => {
        const { data: p } = await supabase.from("profiles").select("email").eq("id", t.user_id).single();
        return { ...t, user_email: p?.email };
      }));
      setTransactions(enriched);
    }
  };

  const loadSettings = async () => {
    const data = await getRewardSettings();
    if (data) {
      setSettings(data);
      setSettingsForm({
        reward_value: data.reward_value,
        expiry_days: data.expiry_days,
        reward_type: data.reward_type,
        is_active: data.is_active,
        description: data.description,
      });
    }
  };

  const loadAbuseLog = async () => {
    const { data } = await supabase.from("referral_abuse_log").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setAbuseLog(data);
  };

  useEffect(() => {
    loadReferrals();
    loadTransactions();
    loadSettings();
    loadAbuseLog();
  }, []);

  const updateReferralStatus = async (id: string, status: "rewarded" | "rejected") => {
    const { error } = await supabase.from("referrals").update({ status, rewarded_at: status === "rewarded" ? new Date().toISOString() : null }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "rewarded" ? "Reward approved & issued" : "Referral rejected");
    loadReferrals();
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    if (settings?.id) {
      await supabase.from("reward_settings").update({ ...settingsForm, updated_at: new Date().toISOString() }).eq("id", settings.id);
    } else {
      await supabase.from("reward_settings").insert(settingsForm);
    }
    setSavingSettings(false);
    toast.success("Reward settings saved");
    invalidateRewardSettingsCache();
    loadSettings();
  };

  const extendExpiry = async (rewardId: string, days: number) => {
    const reward = transactions.find((t) => t.id === rewardId);
    if (!reward) return;
    const current = reward.expires_at ? new Date(reward.expires_at) : new Date();
    current.setDate(current.getDate() + days);
    await supabase.from("user_rewards").update({ expires_at: current.toISOString() }).eq("id", rewardId);
    toast.success("Expiry extended");
    loadTransactions();
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    rewarded: "bg-green-100 text-green-700",
    rejected: "bg-gray-100 text-gray-500",
    expired: "bg-red-100 text-red-600",
  };

  const field = "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-3 py-2 text-sm font-[Montserrat] focus:outline-none";

  const tabs: { key: Tab; label: string }[] = [
    { key: "referrals", label: "All Referrals" },
    { key: "transactions", label: "Wallet Transactions" },
    { key: "settings", label: "Reward Settings" },
    { key: "abuse", label: "Abuse Log" },
  ];

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold font-[Montserrat] transition-all whitespace-nowrap flex-1 ${
              tab === t.key ? "bg-white text-[#E8192C] shadow-sm" : "text-gray-500"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── REFERRALS ── */}
      {tab === "referrals" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-chewy text-lg text-gray-800">Referral Tracking</h3>
            <button onClick={loadReferrals} className="text-gray-400 hover:text-gray-600">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-[Montserrat]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Referrer</th>
                  <th className="px-4 py-3 text-left">Referred</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Reward</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading…</td></tr>
                ) : referrals.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No referrals yet</td></tr>
                ) : referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.referrer_name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.referred_name ?? r.referred_phone ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs bg-amber-50 text-amber-700 rounded">{r.code}</td>
                    <td className="px-4 py-3 text-[#E8192C] font-semibold">{formatPrice(r.reward_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString("en-GB")}</td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => updateReferralStatus(r.id, "rewarded")}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded-lg text-xs font-[Montserrat] flex items-center gap-1">
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => updateReferralStatus(r.id, "rejected")}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg text-xs font-[Montserrat] flex items-center gap-1">
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {tab === "transactions" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-chewy text-lg text-gray-800">Wallet Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-[Montserrat]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Balance</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Expires</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No transactions yet</td></tr>
                ) : transactions.map((t) => {
                  const expired = t.expires_at && new Date(t.expires_at) < new Date();
                  return (
                    <tr key={t.id} className={`hover:bg-gray-50 ${expired ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 text-gray-600 text-xs">{t.user_email ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-800 font-semibold">{t.description}</td>
                      <td className="px-4 py-3 text-[#E8192C] font-semibold">{formatPrice(t.amount)}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">{formatPrice(t.balance)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 capitalize">{t.source}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {t.expires_at ? (
                          <span className={expired ? "text-red-500" : "text-green-600"}>
                            {new Date(t.expires_at).toLocaleDateString("en-GB")}
                            {expired && " (expired)"}
                          </span>
                        ) : "No expiry"}
                      </td>
                      <td className="px-4 py-3">
                        {!expired && t.expires_at && (
                          <button onClick={() => extendExpiry(t.id, 30)}
                            className="text-xs text-blue-600 hover:underline font-[Montserrat]">
                            +30 days
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab === "settings" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 max-w-lg">
          <div>
            <h3 className="font-chewy text-xl text-gray-800">Reward Settings</h3>
            <p className="text-gray-400 text-sm font-[Montserrat] mt-0.5">
              Configure what reward is given when a referral completes their first order.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">
              Reward Type
            </label>
            <select value={settingsForm.reward_type} onChange={(e) => setSettingsForm((f) => ({ ...f, reward_type: e.target.value }))} className={field}>
              <option value="cash_credit">Cash Credit (added to Referral Wallet)</option>
              <option value="free_delivery">Free Delivery</option>
              <option value="percentage_discount">Percentage Discount</option>
              <option value="fixed_discount">Fixed Discount</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">
              Reward Value
              <span className="ml-1 text-gray-400 font-normal">
                {settingsForm.reward_type === "cash_credit" || settingsForm.reward_type === "fixed_discount"
                  ? "(₦ amount)"
                  : settingsForm.reward_type === "percentage_discount"
                  ? "(% discount)"
                  : "(0 = free)"}
              </span>
            </label>
            <input type="number" value={settingsForm.reward_value}
              onChange={(e) => setSettingsForm((f) => ({ ...f, reward_value: Number(e.target.value) }))}
              className={field} placeholder="e.g. 2000" />
            <p className="text-xs text-gray-400 font-[Montserrat] mt-1">
              Default is ₦2,000. Change this any time — applies to new referrals only.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">
              Reward Expiry (days)
              <span className="ml-1 text-gray-400 font-normal">(from date of issue)</span>
            </label>
            <input type="number" value={settingsForm.expiry_days}
              onChange={(e) => setSettingsForm((f) => ({ ...f, expiry_days: Number(e.target.value) }))}
              className={field} placeholder="e.g. 60" />
            <p className="text-xs text-gray-400 font-[Montserrat] mt-1">
              Set to 0 for no expiry. Default is 60 days.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Description</label>
            <input value={settingsForm.description}
              onChange={(e) => setSettingsForm((f) => ({ ...f, description: e.target.value }))}
              className={field} placeholder="Shown in customer wallet" />
          </div>

          <label className="flex items-center gap-2 text-sm font-[Montserrat] font-semibold text-gray-700">
            <input type="checkbox" checked={settingsForm.is_active}
              onChange={(e) => setSettingsForm((f) => ({ ...f, is_active: e.target.checked }))} />
            Referral rewards active
          </label>

          <button onClick={saveSettings} disabled={savingSettings}
            className="w-full bg-[#E8192C] text-white py-3 rounded-xl font-bold font-[Montserrat] hover:bg-[#c8151f] disabled:opacity-60">
            {savingSettings ? "Saving…" : "Save Settings"}
          </button>
        </div>
      )}

      {/* ── ABUSE LOG ── */}
      {tab === "abuse" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-chewy text-lg text-gray-800">Abuse Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-[Montserrat]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">IP</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {abuseLog.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">No abuse attempts recorded</td></tr>
                ) : abuseLog.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-amber-700">{a.code ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{a.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{a.ip ?? "—"}</td>
                    <td className="px-4 py-3 text-red-600 text-xs">{a.reason}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(a.created_at).toLocaleString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
