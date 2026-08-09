const { createClient } = require("@supabase/supabase-js");
const { buildReceipt }  = require("./escpos");
const { printBuffer }   = require("./rawprint");
const fs   = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(
  process.pkg ? path.dirname(process.execPath) : path.join(__dirname, ".."),
  "config.json"
);

let config = {};
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
} catch {
  console.error("\n[ERROR] Cannot read config.json");
  console.error("        Expected location:", CONFIG_PATH);
  console.error("        Make sure config.json is in the same folder as this .exe\n");
  process.exit(1);
}

const { supabaseUrl, supabaseServiceRoleKey, printerName } = config;

if (!supabaseServiceRoleKey || supabaseServiceRoleKey === "PASTE_SERVICE_ROLE_KEY_HERE") {
  console.error("\n[ERROR] supabaseServiceRoleKey is not set in config.json");
  console.error("        1. Open config.json (in the same folder as this .exe)");
  console.error("        2. Go to: https://supabase.com/dashboard/project/fcukkruyuhnehujmlrur/settings/api");
  console.error("        3. Copy the 'service_role' key and paste it into config.json\n");
  process.exit(1);
}

if (!printerName || printerName === "ENTER_PRINTER_NAME_HERE") {
  console.error("\n[ERROR] printerName is not set in config.json");
  console.error("        1. Open config.json");
  console.error("        2. Open Windows Start > Settings > Bluetooth & devices > Printers & scanners");
  console.error("        3. Find your Xprinter, copy its exact name, paste into config.json\n");
  process.exit(1);
}

console.log("\n================================================");
console.log("      O'CHEL FOODS — PRINT SERVER v1.0        ");
console.log("================================================");
console.log(`  Printer : ${printerName}`);
console.log(`  Database: ${supabaseUrl}`);
console.log("================================================\n");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let printCount  = 0;
let connected   = false;
let retryTimer  = null;

const printedIds = new Set();

async function handleOrder(order) {
  if (printedIds.has(order.id)) return;
  printedIds.add(order.id);

  const short = String(order.id).slice(0, 8).toUpperCase();
  console.log(`\n>>> NEW ORDER #${short} — ${order.customer_name} (${order.customer_phone})`);

  try {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: items, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (error) throw new Error(error.message);

    const receipt = buildReceipt(order, items || []);
    console.log(`    Sending ${receipt.length} bytes to printer...`);
    const ok = printBuffer(printerName, receipt);

    if (ok) {
      printCount++;
      console.log(`    [OK] Printed successfully (total: ${printCount})`);
    } else {
      console.error(`    [FAIL] Printer did not respond. Check it is on, connected and not out of paper.`);
    }
  } catch (err) {
    console.error(`    [ERROR] ${err.message}`);
  }
}

function connect() {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }

  const channel = supabase
    .channel("ochel-print-v1")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "orders" },
      (payload) => handleOrder(payload.new)
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        if (!connected) {
          connected = true;
          console.log("[READY] Listening for new orders. Keep this window open.\n");
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        connected = false;
        console.error(`[WARN] Connection lost (${status}). Reconnecting in 15s...`);
        supabase.removeChannel(channel).catch(() => {});
        retryTimer = setTimeout(connect, 15000);
      }
      if (err) console.error("[CHANNEL ERR]", err);
    });
}

process.on("SIGINT", () => {
  console.log("\n[STOPPED] Print server shut down.");
  process.exit(0);
});

connect();
