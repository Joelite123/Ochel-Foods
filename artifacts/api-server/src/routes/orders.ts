import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

/**
 * POST /api/orders
 * Save a new order from the checkout form.
 */
router.post("/", async (req: Request, res: Response) => {
  const {
    user_id, customer_name, customer_phone, customer_email,
    delivery_address, delivery_zone_id, delivery_fee, subtotal, total,
    discount_amount, referral_wallet_used, promo_code, delivery_time,
    special_instructions, referral_code_used, items,
  } = req.body;

  if (!customer_name || !customer_phone || !delivery_address || !subtotal) {
    return res.status(400).json({ error: "Missing required order fields" });
  }

  // Validate promo code if provided
  let promoDiscount = 0;
  if (promo_code) {
    const { data: promo } = await supabaseAdmin
      .from("promotions")
      .select("*")
      .eq("code", promo_code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (promo) {
      const now = new Date();
      const valid =
        (!promo.starts_at || new Date(promo.starts_at) <= now) &&
        (!promo.ends_at || new Date(promo.ends_at) >= now) &&
        (!promo.max_uses || promo.uses_count < promo.max_uses);

      if (valid) {
        if (promo.discount_type === "percentage") {
          promoDiscount = (subtotal * promo.discount_value) / 100;
        } else {
          promoDiscount = promo.discount_value;
        }
        // Increment uses_count
        await supabaseAdmin
          .from("promotions")
          .update({ uses_count: promo.uses_count + 1 })
          .eq("id", promo.id);
      }
    }
  }

  // Create order
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: user_id || null,
      customer_name, customer_phone, customer_email: customer_email || null,
      delivery_address, delivery_zone_id: delivery_zone_id || null,
      delivery_fee: Number(delivery_fee) || 0,
      subtotal: Number(subtotal),
      total: Number(total) - promoDiscount,
      discount_amount: Number(discount_amount || 0) + promoDiscount,
      referral_wallet_used: Number(referral_wallet_used) || 0,
      promo_code: promo_code || null,
      status: "pending",
      delivery_time: delivery_time || null,
      special_instructions: special_instructions || null,
      referral_code_used: referral_code_used || null,
    })
    .select()
    .single();

  if (orderErr) return res.status(500).json({ error: orderErr.message });

  // Insert order items
  if (items?.length && order) {
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId || null,
      product_name: item.name,
      size: item.size || null,
      price: Number(item.price),
      quantity: Number(item.quantity),
      extras: item.extras || null,
      removed_ingredients: item.removedIngredients || null,
      note: item.note || null,
    }));
    await supabaseAdmin.from("order_items").insert(orderItems);
  }

  // Deduct wallet balance if used
  if (user_id && referral_wallet_used > 0) {
    const { data: rewards } = await supabaseAdmin
      .from("user_rewards")
      .select("*")
      .eq("user_id", user_id)
      .eq("reward_type", "cash_credit")
      .eq("is_used", false)
      .gt("balance", 0)
      .order("expires_at", { ascending: true, nullsFirst: false });

    let remaining = Number(referral_wallet_used);
    for (const reward of rewards ?? []) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, Number(reward.balance));
      const newBalance = Number(reward.balance) - deduct;
      await supabaseAdmin
        .from("user_rewards")
        .update({ balance: newBalance, is_used: newBalance <= 0 })
        .eq("id", reward.id);
      remaining -= deduct;
    }
    // Update profile wallet
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("referral_wallet_balance")
      .eq("id", user_id)
      .single();
    if (profile) {
      await supabaseAdmin.from("profiles").update({
        referral_wallet_balance: Math.max(0, Number(profile.referral_wallet_balance) - Number(referral_wallet_used)),
      }).eq("id", user_id);
    }
  }

  return res.json({ success: true, orderId: order.id });
});

/**
 * GET /api/orders/:id
 * Get a single order with items.
 */
router.get("/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Order not found" });
  return res.json(data);
});

export default router;
