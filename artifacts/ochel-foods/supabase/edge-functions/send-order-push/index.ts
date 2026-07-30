// Supabase Edge Function: send-order-push
// Triggered by a Supabase Database Webhook on INSERT to the `orders` table.
// Reads all push subscriptions and sends a Web Push notification for the new order.

import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore — npm: specifier for web-push in Deno
import webpush from "npm:web-push@3";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@ochelfoods.com";
const WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";

// Supabase injects these automatically in Edge Functions
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

Deno.serve(async (req: Request) => {
  // Verify the shared secret so only Supabase webhooks can trigger this
  const authHeader = req.headers.get("x-webhook-secret");
  if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("VAPID keys not configured");
    return new Response("VAPID keys not set", { status: 500 });
  }

  let body: { record?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const order = body.record;
  if (!order) {
    return new Response("No record in payload", { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch all active push subscriptions
  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error) {
    console.error("Failed to fetch subscriptions:", error);
    return new Response("DB error", { status: 500 });
  }

  if (!subs?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const customerName = String(order.customer_name ?? "Customer");
  const total = Number(order.total ?? 0);
  const orderId = String(order.id ?? "");

  const payload = JSON.stringify({
    title: "🛎 New Order Received",
    body: `${customerName} · ₦${total.toLocaleString("en-NG")}`,
    url: "/admin/orders",
    tag: `order-${orderId}`,
  });

  const staleEndpoints: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          staleEndpoints.push(sub.endpoint);
        } else {
          console.warn("Push send failed:", err);
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (staleEndpoints.length) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);
  }

  console.log(`Push sent to ${sent}/${subs.length} devices for order ${orderId}`);
  return new Response(JSON.stringify({ sent, stale: staleEndpoints.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
