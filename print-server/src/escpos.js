const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

const LINE_WIDTH = 32;

function b(...args) { return Buffer.from(args); }
function t(str)     { return Buffer.from(str, "utf8"); }

function padLine(left, right, width = LINE_WIDTH) {
  const gap = width - left.length - right.length;
  return left + " ".repeat(Math.max(1, gap)) + right;
}

function center(str, width = LINE_WIDTH) {
  const pad = Math.max(0, Math.floor((width - str.length) / 2));
  return " ".repeat(pad) + str;
}

function wrapText(str, width = LINE_WIDTH) {
  const words = str.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if (line.length + w.length + 1 > width) {
      lines.push(line);
      line = w;
    } else {
      line = line ? line + " " + w : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fmtPrice(num) {
  return "N" + Math.round(Number(num) || 0).toLocaleString("en-NG");
}

function buildReceipt(order, items) {
  const p = [];
  const add = (buf) => p.push(buf);

  const now = new Date();
  const timeStr = now.toLocaleString("en-NG", {
    hour: "2-digit", minute: "2-digit",
    day: "2-digit", month: "short", year: "numeric",
  });

  const isPickup = (order.delivery_address || "").startsWith("PICK UP:");

  add(b(ESC, 0x40));

  add(b(ESC, 0x61, 0x01));
  add(b(ESC, 0x45, 0x01));
  add(b(GS,  0x21, 0x11));
  add(t("O'CHEL FOODS\n"));
  add(b(GS,  0x21, 0x00));
  add(b(ESC, 0x45, 0x00));
  add(t(center(timeStr) + "\n"));
  add(t("================================\n"));

  add(b(ESC, 0x45, 0x01));
  add(t(center(isPickup ? "[ PICK UP ORDER ]" : "[ DELIVERY ORDER ]") + "\n"));
  add(b(ESC, 0x45, 0x00));
  add(t("--------------------------------\n"));

  add(b(ESC, 0x61, 0x00));
  for (const item of (items || [])) {
    const name  = String(item.product_name || "Item");
    const qty   = Number(item.quantity) || 1;
    const price = (Number(item.unit_price) || 0) * qty;
    const left  = `${qty}x ${name}`;
    add(t(padLine(left, fmtPrice(price)) + "\n"));
    if (item.size) add(t(`   Size: ${item.size}\n`));
    const extras = Array.isArray(item.extras) ? item.extras : [];
    for (const ex of extras) {
      add(t(`   + ${ex.name}${ex.quantity > 1 ? " x" + ex.quantity : ""}\n`));
    }
    const removed = Array.isArray(item.removed_ingredients) ? item.removed_ingredients : [];
    if (removed.length) add(t(`   NO: ${removed.join(", ")}\n`));
    if (item.note) add(t(`   Note: ${item.note}\n`));
  }

  add(t("--------------------------------\n"));
  add(t(padLine("Subtotal:", fmtPrice(order.subtotal)) + "\n"));
  if (!isPickup && Number(order.delivery_fee) > 0) {
    add(t(padLine("Delivery:", fmtPrice(order.delivery_fee)) + "\n"));
  }
  if (Number(order.discount_amount) > 0) {
    add(t(padLine("Discount:", "-" + fmtPrice(order.discount_amount)) + "\n"));
  }
  add(b(ESC, 0x45, 0x01));
  add(t(padLine("TOTAL:", fmtPrice(order.total)) + "\n"));
  add(b(ESC, 0x45, 0x00));
  add(t("================================\n"));

  add(b(ESC, 0x45, 0x01));
  add(t("CUSTOMER DETAILS\n"));
  add(b(ESC, 0x45, 0x00));
  add(t(`Name:  ${order.customer_name || "-"}\n`));
  add(t(`Phone: ${order.customer_phone || "-"}\n`));
  if (order.delivery_time) add(t(`Time:  ${order.delivery_time}\n`));

  if (isPickup) {
    add(t("Mode:  Pick Up at Store\n"));
  } else {
    const addr = (order.delivery_address || "").substring(0, 96);
    const addrLines = wrapText(addr, LINE_WIDTH - 7);
    addrLines.forEach((l, i) => add(t((i === 0 ? "Addr:  " : "       ") + l + "\n")));
  }

  if (order.special_instructions) {
    add(t("--------------------------------\n"));
    add(b(ESC, 0x45, 0x01));
    add(t("INSTRUCTIONS:\n"));
    add(b(ESC, 0x45, 0x00));
    const noteLines = wrapText(String(order.special_instructions), LINE_WIDTH);
    for (const l of noteLines) add(t(l + "\n"));
  }

  add(t("================================\n"));
  add(b(ESC, 0x61, 0x01));
  add(t("Thank you for your order!\n"));
  add(t("+234 905 635 1651\n"));
  add(b(LF, LF, LF, LF));
  add(b(GS, 0x56, 0x42, 0x00));

  return Buffer.concat(p);
}

module.exports = { buildReceipt };
