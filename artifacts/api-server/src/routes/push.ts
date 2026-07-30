import { Router, Request, Response } from "express";
import webpush from "web-push";
import { supabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

const router = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ?? "mailto:admin@ochelfoods.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  logger.warn("VAPID keys not set — push notifications disabled");
}

/**
 * POST /api/push/subscribe
 * Save (or update) a browser push subscription for this device.
 */
router.post("/subscribe", async (req: Request, res: Response) => {
  const { endpoint, p256dh, auth, userAgent } = req.body as {
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    userAgent?: string;
  };

  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: "Missing subscription fields" });
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      { endpoint, p256dh, auth, user_agent: userAgent ?? null },
      { onConflict: "endpoint" }
    );

  if (error) {
    logger.error({ err: error }, "Failed to save push subscription");
    return res.status(500).json({ error: error.message });
  }

  logger.info({ endpoint: endpoint.slice(-20) }, "Push subscription saved");
  return res.json({ success: true });
});

/**
 * DELETE /api/push/subscribe
 * Remove a push subscription (when the user disables notifications).
 */
router.delete("/subscribe", async (req: Request, res: Response) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

  await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  return res.json({ success: true });
});

/**
 * Send a push notification to all subscribed staff devices.
 * Called internally after a new website order is created.
 */
export async function sendOrderPush(order: {
  id: string;
  customer_name: string;
  total: number;
  items_count?: number;
}): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error || !subs?.length) return;

  const itemsLabel =
    order.items_count != null
      ? `${order.items_count} item${order.items_count !== 1 ? "s" : ""}`
      : "New order";

  const payload = JSON.stringify({
    title: "🛎 New Order Received",
    body: `${order.customer_name} · ${itemsLabel} · ₦${Number(
      order.total
    ).toLocaleString("en-NG")}`,
    url: "/admin/orders",
    tag: `order-${order.id}`,
  });

  const staleEndpoints: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        // 410 Gone or 404 = subscription expired — remove it
        if (status === 410 || status === 404) {
          staleEndpoints.push(sub.endpoint);
        } else {
          logger.warn({ err }, "Push send failed");
        }
      }
    })
  );

  if (staleEndpoints.length) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);
    logger.info({ count: staleEndpoints.length }, "Removed stale push subscriptions");
  }

  logger.info({ orderId: order.id, devices: subs.length }, "Push notifications sent");
}

export default router;
