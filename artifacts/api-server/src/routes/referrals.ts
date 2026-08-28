import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

/**
 * POST /api/referrals/reward
 * Called when an order's status changes to "delivered".
 * Validates and issues the referral reward if eligible.
 */
router.post("/reward", async (req: Request, res: Response) => {
  const { orderId } = req.body as { orderId?: string };
  if (!orderId) return res.status(400).json({ error: "orderId required" });

  // 1. Get order
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "delivered") return res.status(400).json({ error: "Order is not delivered" });
  if (!order.referral_code_used) return res.status(200).json({ message: "No referral code used" });

function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) {
    return "0" + digits.slice(3);
  }
  return digits;
}

// 2. Find the referral code owner and profile
  const { data: refCode, error: rcErr } = await supabaseAdmin
    .from("referral_codes")
    .select("*, profiles(id, email, phone, full_name)")
    .eq("code", order.referral_code_used)
    .single();

  if (rcErr || !refCode) return res.status(404).json({ error: "Referral code not found" });
  const referrerProfile = (refCode as any).profiles;

  // 3. Anti-abuse: self-referral check (User ID, Phone, Email)
  const isSelfUserId = Boolean(order.user_id && order.user_id === refCode.user_id);
  const isSelfPhone = Boolean(
    order.customer_phone &&
    referrerProfile?.phone &&
    normalizePhone(order.customer_phone) === normalizePhone(referrerProfile.phone)
  );
  const isSelfEmail = Boolean(
    order.customer_email &&
    referrerProfile?.email &&
    order.customer_email.trim().toLowerCase() === referrerProfile.email.trim().toLowerCase()
  );

  if (isSelfUserId || isSelfPhone || isSelfEmail) {
    await supabaseAdmin.from("referral_abuse_log").insert({
      user_id: order.user_id,
      code: order.referral_code_used,
      phone: order.customer_phone,
      reason: "Self-referral attempt (matched user, phone, or email)",
    });
    return res.status(400).json({ error: "Self-referral not allowed" });
  }

  // 4. Anti-abuse: check if this referred user already triggered a reward across ANY code
  const refFilters: string[] = [];
  if (order.user_id) refFilters.push(`referred_id.eq.${order.user_id}`);
  if (order.customer_phone) refFilters.push(`referred_phone.eq.${order.customer_phone}`);

  if (refFilters.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("status", "rewarded")
      .or(refFilters.join(","));

    if (existing && existing.length > 0) {
      await supabaseAdmin.from("referral_abuse_log").insert({
        user_id: order.user_id,
        code: order.referral_code_used,
        phone: order.customer_phone,
        reason: "Duplicate referral reward attempt (customer already rewarded)",
      });
      return res.status(400).json({ error: "Referral already rewarded for this user/phone" });
    }
  }

  // 5. Anti-abuse: First-time customers only (Check if customer has any prior delivered order)
  const orderFilters: string[] = [];
  if (order.user_id) orderFilters.push(`user_id.eq.${order.user_id}`);
  if (order.customer_phone) orderFilters.push(`customer_phone.eq.${order.customer_phone}`);

  if (orderFilters.length > 0) {
    const { data: priorOrders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("status", "delivered")
      .neq("id", orderId)
      .or(orderFilters.join(","));

    if (priorOrders && priorOrders.length > 0) {
      await supabaseAdmin.from("referral_abuse_log").insert({
        user_id: order.user_id,
        code: order.referral_code_used,
        phone: order.customer_phone,
        reason: "Not a first-time customer (has prior delivered order)",
      });
      return res.status(400).json({ error: "Referrals only valid for first-time customers" });
    }
  }

  // 5. Get reward settings
  const { data: settings } = await supabaseAdmin
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

  // 6. Create referral record
  const { error: refErr } = await supabaseAdmin.from("referrals").insert({
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

  if (refErr) return res.status(500).json({ error: refErr.message });

  // 7. Issue reward to referrer's wallet
  await supabaseAdmin.from("user_rewards").insert({
    user_id: refCode.user_id,
    reward_type: "cash_credit",
    amount: rewardAmount,
    balance: rewardAmount,
    description: `Referral reward — friend used code ${order.referral_code_used}`,
    source: "referral",
    expires_at: expiresAt,
    is_used: false,
  });

  // 8. Update referrer's wallet balance in profile
  await supabaseAdmin.rpc("increment_wallet", {
    user_id_param: refCode.user_id,
    amount_param: rewardAmount,
  }).catch(() => {
    // Fallback: manual update if RPC not available
    supabaseAdmin
      .from("profiles")
      .select("referral_wallet_balance")
      .eq("id", refCode.user_id)
      .single()
      .then(({ data: p }) => {
        if (p) {
          supabaseAdmin.from("profiles").update({
            referral_wallet_balance: Number(p.referral_wallet_balance) + rewardAmount,
          }).eq("id", refCode.user_id);
        }
      });
  });

  // 9. Update referral code stats
  await supabaseAdmin.from("referral_codes").update({
    total_referrals: refCode.total_referrals + 1,
    total_earned: Number(refCode.total_earned) + rewardAmount,
  }).eq("id", refCode.id);

  return res.json({ success: true, rewardAmount, expiresAt });
});

/**
 * POST /api/referrals/generate-code
 * Creates a referral code for a user using the service-role key (bypasses RLS).
 * Returns the full referral_codes row.
 */
router.post("/generate-code", async (req: Request, res: Response) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) return res.status(400).json({ error: "userId required" });

  // Return existing code if already present
  const { data: existing } = await supabaseAdmin
    .from("referral_codes")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (existing) return res.json({ referralCode: existing });

  // Generate a unique code — retry up to 5 times on collision
  for (let i = 0; i < 5; i++) {
    const code = Math.random().toString(36).toUpperCase().slice(2, 8);
    const { error } = await supabaseAdmin
      .from("referral_codes")
      .insert({ user_id: userId, code });
    if (!error) {
      const { data: created } = await supabaseAdmin
        .from("referral_codes")
        .select("*")
        .eq("user_id", userId)
        .single();
      return res.json({ referralCode: created });
    }
  }

  return res.status(500).json({ error: "Failed to generate referral code" });
});

/**
 * POST /api/referrals/validate
 * Check if a referral code is valid before applying it at checkout.
 */
router.post("/validate", async (req: Request, res: Response) => {
  const { code, userId, phone, email } = req.body as { code?: string; userId?: string; phone?: string; email?: string };
  if (!code) return res.status(400).json({ error: "Code required" });

  const { data: refCode } = await supabaseAdmin
    .from("referral_codes")
    .select("*, profiles(id, email, phone, full_name)")
    .eq("code", code.toUpperCase())
    .single();

  if (!refCode) return res.status(404).json({ valid: false, error: "Invalid referral code" });
  const referrerProfile = (refCode as any).profiles;

  // Self-referral checks (User ID, Phone, Email)
  const isSelfUserId = Boolean(userId && userId === refCode.user_id);
  const isSelfPhone = Boolean(
    phone &&
    referrerProfile?.phone &&
    normalizePhone(phone) === normalizePhone(referrerProfile.phone)
  );
  const isSelfEmail = Boolean(
    email &&
    referrerProfile?.email &&
    email.trim().toLowerCase() === referrerProfile.email.trim().toLowerCase()
  );

  if (isSelfUserId || isSelfPhone || isSelfEmail) {
    return res.json({ valid: false, error: "You cannot use your own referral code" });
  }

  return res.json({
    valid: true,
    referrerName: referrerProfile?.full_name ?? "a friend",
  });
});

export default router;
