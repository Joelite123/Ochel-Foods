import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, DBUserReward, DBReferralCode, DBRewardSetting, DBReferral } from "@/lib/supabase";
import { getRewardSettings } from "@/lib/rewardSettingsCache";
import { useAuth } from "@/contexts/AuthContext";

type RewardContextType = {
  rewards: DBUserReward[];
  pendingReferrals: DBReferral[];
  referralCode: DBReferralCode | null;
  rewardSettings: DBRewardSetting | null;
  walletBalance: number;
  pendingBalance: number;
  activeRewards: DBUserReward[];
  isLoading: boolean;
  generateReferralCode: () => Promise<string | null>;
  applyWalletBalance: (amount: number) => void;
  walletApplied: number;
  setWalletApplied: (n: number) => void;
  refresh: () => Promise<void>;
};

const RewardContext = createContext<RewardContextType | undefined>(undefined);


export function RewardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<DBUserReward[]>([]);
  const [pendingReferrals, setPendingReferrals] = useState<DBReferral[]>([]);
  const [referralCode, setReferralCode] = useState<DBReferralCode | null>(null);
  const [rewardSettings, setRewardSettings] = useState<DBRewardSetting | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletApplied, setWalletApplied] = useState(0);

  const loadData = async () => {
    if (!user) {
      setRewards([]);
      setPendingReferrals([]);
      setReferralCode(null);
      return;
    }
    setIsLoading(true);

    // Load rewards
    const { data: rwData } = await supabase
      .from("user_rewards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (rwData) setRewards(rwData as DBUserReward[]);

    // Load pending referrals where user is the referrer
    const { data: pendData } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (pendData) setPendingReferrals(pendData as DBReferral[]);

    // Load referral code — auto-generate via Supabase if not yet created.
    // Use maybeSingle() so a missing row returns null (not an error),
    // preventing the spurious "else" branch from firing when the row exists.
    const { data: rcData } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (rcData) {
      setReferralCode(rcData as DBReferralCode);
    } else {
      // First login — create a code automatically (RLS INSERT policy required).
      // Re-check after each failed insert in case a concurrent request already
      // created the row (race condition guard).
      for (let i = 0; i < 5; i++) {
        const code = Math.random().toString(36).toUpperCase().slice(2, 8);
        const { error } = await supabase
          .from("referral_codes")
          .insert({ user_id: user.id, code });
        if (!error) {
          // Insert succeeded — read back the canonical row
          const { data: created } = await supabase
            .from("referral_codes")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          if (created) setReferralCode(created as DBReferralCode);
          break;
        }
        // Insert failed (likely a unique-constraint violation from a concurrent
        // request that already created the row). Read whatever is there now.
        const { data: existing } = await supabase
          .from("referral_codes")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (existing) {
          setReferralCode(existing as DBReferralCode);
          break;
        }
      }
    }

    // Load reward settings
    const rsData = await getRewardSettings();
    if (rsData) setRewardSettings(rsData);

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  /** Active (non-expired, non-used) cash rewards */
  const activeRewards = rewards.filter((r) => {
    if (r.is_used || r.balance <= 0) return false;
    if (r.expires_at && new Date(r.expires_at) < new Date()) return false;
    return true;
  });

  const walletBalance = activeRewards
    .filter((r) => r.reward_type === "cash_credit")
    .reduce((sum, r) => sum + r.balance, 0);

  const pendingBalance = pendingReferrals.reduce(
    (sum, r) => sum + (Number(r.reward_amount) || 0),
    0
  );

  const generateReferralCode = async (): Promise<string | null> => {
    if (!user) return null;

    // Idempotent: if a code already exists for this user, return it unchanged.
    // This prevents a second code being created if the user clicks the button
    // again or if state wasn't loaded yet.
    const { data: existing } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      setReferralCode(existing as DBReferralCode);
      return (existing as DBReferralCode).code;
    }

    // No code exists yet — generate one (retry on collision)
    for (let i = 0; i < 5; i++) {
      const code = Math.random().toString(36).toUpperCase().slice(2, 8);
      const { data: created, error } = await supabase
        .from("referral_codes")
        .insert({ user_id: user.id, code })
        .select("*")
        .single();
      if (!error && created) {
        setReferralCode(created as DBReferralCode);
        return (created as DBReferralCode).code;
      }
    }
    return null;
  };

  const applyWalletBalance = (amount: number) => {
    setWalletApplied(Math.min(amount, walletBalance));
  };

  return (
    <RewardContext.Provider
      value={{
        rewards,
        pendingReferrals,
        referralCode,
        rewardSettings,
        walletBalance,
        pendingBalance,
        activeRewards,
        isLoading,
        generateReferralCode,
        applyWalletBalance,
        walletApplied,
        setWalletApplied,
        refresh: loadData,
      }}
    >
      {children}
    </RewardContext.Provider>
  );
}

export function useRewards() {
  const ctx = useContext(RewardContext);
  if (!ctx) throw new Error("useRewards must be used within RewardProvider");
  return ctx;
}
