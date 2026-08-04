/**
 * Shared reward settings cache — same pattern as promosCache.ts / useMenuData.ts.
 *
 * Fetches the cash_credit reward_settings row from Supabase exactly once per
 * session. RewardContext, AdminOrders, and AdminReferrals all read from here.
 * Call invalidateRewardSettingsCache() after an admin saves changes so the
 * next read picks up the updated values.
 */

import { supabase } from "./supabase";
import type { DBRewardSetting } from "./supabase";

let cachedRewardSettings: DBRewardSetting | null = null;
let fetchPromise: Promise<DBRewardSetting | null> | null = null;

/**
 * Returns the active cash_credit reward settings row.
 * Hits Supabase only on the first call; subsequent calls resolve instantly
 * from the module-level cache. Concurrent callers share the same in-flight
 * request so there is at most one network round-trip.
 */
export async function getRewardSettings(): Promise<DBRewardSetting | null> {
  if (cachedRewardSettings) return cachedRewardSettings;

  if (!fetchPromise) {
    fetchPromise = Promise.resolve(
      supabase
        .from("reward_settings")
        .select("*")
        .eq("reward_type", "cash_credit")
        .single()
    ).then(({ data }) => {
      cachedRewardSettings = (data as DBRewardSetting) ?? null;
      fetchPromise = null;
      return cachedRewardSettings;
    });
  }

  const pending = fetchPromise;
  return pending;
}

/** Call after an admin saves reward settings changes so the next read re-fetches. */
export function invalidateRewardSettingsCache(): void {
  cachedRewardSettings = null;
}
