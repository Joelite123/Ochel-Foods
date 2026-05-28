import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, DBUserReward, DBReferralCode, DBRewardSetting } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type RewardContextType = {
  rewards: DBUserReward[];
  referralCode: DBReferralCode | null;
  rewardSettings: DBRewardSetting | null;
  walletBalance: number;
  activeRewards: DBUserReward[];
  isLoading: boolean;
  generateReferralCode: () => Promise<string | null>;
  applyWalletBalance: (amount: number) => void;
  walletApplied: number;
  setWalletApplied: (n: number) => void;
  refresh: () => Promise<void>;
};

const RewardContext = createContext<RewardContextType | undefined>(undefined);

/** Generate a random 6-char alphanumeric code */
function genCode(): string {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

export function RewardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<DBUserReward[]>([]);
  const [referralCode, setReferralCode] = useState<DBReferralCode | null>(null);
  const [rewardSettings, setRewardSettings] = useState<DBRewardSetting | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletApplied, setWalletApplied] = useState(0);

  const loadData = async () => {
    if (!user) {
      setRewards([]);
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

    // Load referral code — auto-generate if user doesn't have one yet
    const { data: rcData } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (rcData) {
      setReferralCode(rcData as DBReferralCode);
    } else {
      // Auto-generate on first load (no button needed)
      for (let i = 0; i < 5; i++) {
        const code = genCode();
        const { error } = await supabase
          .from("referral_codes")
          .insert({ user_id: user.id, code });
        if (!error) {
          const { data: newCode } = await supabase
            .from("referral_codes")
            .select("*")
            .eq("user_id", user.id)
            .single();
          if (newCode) setReferralCode(newCode as DBReferralCode);
          break;
        }
      }
    }

    // Load reward settings
    const { data: rsData } = await supabase
      .from("reward_settings")
      .select("*")
      .eq("reward_type", "cash_credit")
      .single();
    if (rsData) setRewardSettings(rsData as DBRewardSetting);

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

  const generateReferralCode = async (): Promise<string | null> => {
    if (!user) return null;
    // Try up to 5 times to get a unique code
    for (let i = 0; i < 5; i++) {
      const code = genCode();
      const { error } = await supabase
        .from("referral_codes")
        .insert({ user_id: user.id, code });
      if (!error) {
        await loadData();
        return code;
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
        referralCode,
        rewardSettings,
        walletBalance,
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
