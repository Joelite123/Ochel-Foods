import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

router.get("/print-stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("connected", { message: "Print stream ready" });

  const keepalive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25000);

  const channelId = `print-stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const channel = supabaseAdmin
    .channel(channelId)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "orders" },
      async (payload) => {
        const order = payload.new as Record<string, unknown>;
        const orderId = String(order["id"] ?? "");

        const { data: items } = await supabaseAdmin
          .from("order_items")
          .select("*")
          .eq("order_id", orderId);

        sendEvent("order", { order, items: items ?? [] });
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        sendEvent("status", { connected: true });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        sendEvent("status", { connected: false, reason: status });
        if (err) console.error("[print-stream] channel error:", err);
      }
    });

  req.on("close", () => {
    clearInterval(keepalive);
    supabaseAdmin.removeChannel(channel).catch(() => {});
    res.end();
  });
});

export default router;
