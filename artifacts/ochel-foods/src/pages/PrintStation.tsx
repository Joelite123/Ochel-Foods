import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;
const LINE = 32;

function b(...args: number[]) { return new Uint8Array(args); }
function t(str: string)       { return new TextEncoder().encode(str); }

function pad(left: string, right: string, w = LINE) {
  const gap = w - left.length - right.length;
  return left + " ".repeat(Math.max(1, gap)) + right;
}

function centre(str: string, w = LINE) {
  const p = Math.max(0, Math.floor((w - str.length) / 2));
  return " ".repeat(p) + str;
}

function wrap(str: string, w = LINE) {
  const words = str.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line.length + word.length + 1 > w) { lines.push(line); line = word; }
    else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

function fmtN(n: unknown) {
  return "N" + Math.round(Number(n) || 0).toLocaleString("en-NG");
}

type OrderItem = {
  product_name: string;
  quantity: number;
  price: number;
  size?: string;
  extras?: { name: string; quantity: number }[];
  removed_ingredients?: string[];
  note?: string;
};

type Order = Record<string, unknown>;

function buildEscPos(order: Order, items: OrderItem[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const add = (u: Uint8Array) => parts.push(u);
  const concat = (ps: Uint8Array[]) => {
    const total = ps.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const p of ps) { out.set(p, offset); offset += p.length; }
    return out;
  };

  const now = new Date();
  const timeStr = now.toLocaleString("en-NG", {
    hour: "2-digit", minute: "2-digit",
    day: "2-digit", month: "short", year: "numeric",
  });
  const isPickup = String(order["delivery_address"] ?? "").startsWith("PICK UP:");

  add(b(ESC, 0x40));
  add(b(ESC, 0x61, 0x01)); add(b(ESC, 0x45, 0x01)); add(b(GS, 0x21, 0x11));
  add(t("O'CHEL FOODS\n"));
  add(b(GS, 0x21, 0x00)); add(b(ESC, 0x45, 0x00));
  add(t(centre(timeStr) + "\n"));
  add(t("================================\n"));
  add(b(ESC, 0x45, 0x01));
  add(t(centre(isPickup ? "[ PICK UP ORDER ]" : "[ DELIVERY ORDER ]") + "\n"));
  add(b(ESC, 0x45, 0x00));
  add(t("--------------------------------\n"));

  add(b(ESC, 0x61, 0x00));
  for (const item of items) {
    const left  = `${item.quantity}x ${item.product_name}`;
    const right = fmtN((Number(item.price) || 0) * (Number(item.quantity) || 1));
    add(t(pad(left, right) + "\n"));
    if (item.size) add(t(`   Size: ${item.size}\n`));
    for (const ex of item.extras ?? []) add(t(`   + ${ex.name}\n`));
    if (item.removed_ingredients?.length) add(t(`   NO: ${item.removed_ingredients.join(", ")}\n`));
    if (item.note) add(t(`   Note: ${item.note}\n`));
  }

  add(t("--------------------------------\n"));
  add(t(pad("Subtotal:", fmtN(order["subtotal"])) + "\n"));
  if (!isPickup && Number(order["delivery_fee"]) > 0)
    add(t(pad("Delivery:", fmtN(order["delivery_fee"])) + "\n"));
  if (Number(order["discount_amount"]) > 0)
    add(t(pad("Discount:", "-" + fmtN(order["discount_amount"])) + "\n"));
  add(b(ESC, 0x45, 0x01));
  add(t(pad("TOTAL:", fmtN(order["total"])) + "\n"));
  add(b(ESC, 0x45, 0x00));
  add(t("================================\n"));

  add(b(ESC, 0x45, 0x01)); add(t("CUSTOMER DETAILS\n")); add(b(ESC, 0x45, 0x00));
  add(t(`Name:  ${order["customer_name"] ?? "-"}\n`));
  add(t(`Phone: ${order["customer_phone"] ?? "-"}\n`));
  if (order["delivery_time"]) add(t(`Time:  ${order["delivery_time"]}\n`));
  if (isPickup) {
    add(t("Mode:  Pick Up at Store\n"));
  } else {
    const addr = String(order["delivery_address"] ?? "");
    wrap(addr, LINE - 7).forEach((l, i) => add(t((i === 0 ? "Addr:  " : "       ") + l + "\n")));
  }
  if (order["special_instructions"]) {
    add(t("--------------------------------\n"));
    add(b(ESC, 0x45, 0x01)); add(t("INSTRUCTIONS:\n")); add(b(ESC, 0x45, 0x00));
    wrap(String(order["special_instructions"])).forEach((l) => add(t(l + "\n")));
  }

  add(t("================================\n"));
  add(b(ESC, 0x61, 0x01));
  add(t("Thank you for your order!\n"));
  add(t("+234 905 635 1651\n"));
  add(b(LF, LF, LF, LF));
  add(b(GS, 0x56, 0x42, 0x00));

  return concat(parts);
}

function toBase64(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

async function sendToRawBT(bytes: Uint8Array) {
  try {
    await fetch("http://127.0.0.1:9100/rawbt", {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/octet-stream" },
      body: bytes,
    });
  } catch {}
  try {
    await fetch("http://127.0.0.1:9090/rawbt", {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/octet-stream" },
      body: bytes,
    });
  } catch {}
}

type PrintEvent = {
  id: string;
  time: Date;
  name: string;
  total: string;
  isPickup: boolean;
  status: "printing" | "sent" | "failed";
};

export default function PrintStation() {
  const [connected, setConnected] = useState(false);
  const [log, setLog]             = useState<PrintEvent[]>([]);
  const [rawBTPort, setRawBTPort] = useState(9100);
  const esRef = useRef<EventSource | null>(null);
  const printedRef = useRef<Set<string>>(new Set());

  function addLog(entry: PrintEvent) {
    setLog((prev) => [entry, ...prev].slice(0, 30));
  }

  function updateLog(id: string, status: PrintEvent["status"]) {
    setLog((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  }

  async function processPrintJob(order: Order, items: OrderItem[]) {
    const id    = String(order["id"] ?? Date.now());
    const name  = String(order["customer_name"] ?? "Customer");
    const total = fmtN(order["total"]);

    if (printedRef.current.has(id)) return;
    printedRef.current.add(id);

    const entry: PrintEvent = {
      id,
      time: new Date(),
      name,
      total,
      isPickup: String(order["delivery_address"] ?? "").startsWith("PICK UP:"),
      status: "printing",
    };
    addLog(entry);

    try {
      const bytes = buildEscPos(order, items);
      await sendToRawBT(bytes);
      updateLog(id, "sent");
    } catch {
      updateLog(id, "failed");
    }
  }

  useEffect(() => {
    function connect() {
      const streamUrl = apiUrl("/api/print-stream");
      const es = new EventSource(streamUrl);
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.addEventListener("connected", () => setConnected(true));
      es.addEventListener("status", (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        setConnected(!!data.connected);
      });
      es.addEventListener("order", (e) => {
        const { order, items } = JSON.parse((e as MessageEvent).data);
        processPrintJob(order, items);
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 5000);
      };
    }

    connect();
    return () => esRef.current?.close();
  }, []);

  const statusColor = connected ? "#22c55e" : "#ef4444";
  const statusLabel = connected ? "CONNECTED — Listening for orders" : "RECONNECTING…";

  return (
    <div style={{
      minHeight: "100dvh", background: "#0f0f0f", color: "#f0f0f0",
      fontFamily: "'Courier New', monospace", padding: 0, margin: 0,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "16px 20px" }}>
        <div style={{ fontSize: 18, fontWeight: "bold", letterSpacing: 1 }}>
          🖨 O'CHEL FOODS — PRINT STATION
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{
            display: "inline-block", width: 10, height: 10, borderRadius: "50%",
            background: statusColor, boxShadow: `0 0 6px ${statusColor}`,
          }} />
          <span style={{ fontSize: 13, color: statusColor }}>{statusLabel}</span>
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>
          RawBT port: {rawBTPort} &nbsp;
          <button
            onClick={() => setRawBTPort((p) => (p === 9100 ? 9090 : 9100))}
            style={{ fontSize: 11, background: "#2a2a2a", color: "#aaa", border: "1px solid #333", borderRadius: 4, padding: "1px 6px", cursor: "pointer" }}
          >
            switch
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
        {log.length === 0 && (
          <div style={{ textAlign: "center", color: "#444", marginTop: 60, fontSize: 13 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
            Waiting for the first order…
            <br /><br />
            <span style={{ fontSize: 12, color: "#333" }}>
              Make sure RawBT is open and the printer is plugged in via USB OTG.
            </span>
          </div>
        )}
        {log.map((entry) => (
          <div key={entry.id} style={{
            background: "#1a1a1a", border: `1px solid ${entry.status === "failed" ? "#7f1d1d" : "#2a2a2a"}`,
            borderRadius: 8, padding: "10px 14px", marginBottom: 10,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "bold", fontSize: 14 }}>{entry.name}</span>
              <span style={{ fontSize: 13, color: "#f59e0b" }}>{entry.total}</span>
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>
              {entry.time.toLocaleTimeString()} &nbsp;·&nbsp;
              {entry.isPickup ? "Pick Up" : "Delivery"}
            </div>
            <div style={{ marginTop: 6, fontSize: 12 }}>
              {entry.status === "printing" && <span style={{ color: "#3b82f6" }}>⏳ Sending to printer…</span>}
              {entry.status === "sent"     && <span style={{ color: "#22c55e" }}>✅ Printed</span>}
              {entry.status === "failed"   && <span style={{ color: "#ef4444" }}>❌ Print failed — check RawBT</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "#1a1a1a", borderTop: "1px solid #2a2a2a", padding: "10px 20px", fontSize: 11, color: "#444", textAlign: "center" }}>
        Keep this page open in Chrome while the restaurant is open.
        Do not close the RawBT app.
      </div>
    </div>
  );
}
