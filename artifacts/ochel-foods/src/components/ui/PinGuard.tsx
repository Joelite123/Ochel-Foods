import { useState, ReactNode, KeyboardEvent } from "react";
import { Lock } from "lucide-react";
import { useLocation } from "wouter";
import { apiUrl } from "@/lib/api";

/** sessionStorage key — set once per browser session when PIN is accepted */
const SESSION_KEY = "ochel_admin_pin_unlocked";

interface PinGuardProps {
  children: ReactNode;
  /** Shown as "<title> Locked" in the overlay heading */
  title?: string;
}

/**
 * Wraps protected admin content behind a 4-digit PIN overlay.
 *
 * - While locked: shows the PIN entry card; children are never rendered.
 * - Once the correct PIN is accepted: stores a flag in sessionStorage and
 *   renders children. The session flag persists until the tab is closed or
 *   the browser is restarted — no additional prompts for either protected page.
 * - The PIN itself never travels to the frontend; only a {success: true/false}
 *   response is returned by the backend.
 */
export default function PinGuard({ children, title = "Business Overview" }: PinGuardProps) {
  const [, navigate] = useLocation();
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true"
  );
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  /* ── Already unlocked — render content directly ── */
  if (unlocked) return <>{children}</>;

  /* ── Helpers ── */
  const currentPin = digits.join("");

  const focusDigit = (i: number) =>
    (document.getElementById(`ochel-pin-${i}`) as HTMLInputElement | null)?.focus();

  async function submitPin(pinValue: string) {
    if (pinValue.length !== 4 || checking) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/admin/verify-pin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem(SESSION_KEY, "true");
        setUnlocked(true);
      } else {
        setError("Incorrect PIN. Please try again.");
        setDigits(["", "", "", ""]);
        setTimeout(() => focusDigit(0), 0);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  function handleChange(i: number, raw: string) {
    // Accept only a single digit
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    setError("");

    if (digit) {
      if (i < 3) {
        focusDigit(i + 1);
      } else {
        // 4th digit filled — auto-submit
        submitPin(next.join(""));
      }
    }
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      focusDigit(i - 1);
    }
    if (e.key === "Enter" && currentPin.length === 4) {
      submitPin(currentPin);
    }
  }

  /* ── Locked UI ── */
  return (
    <div className="flex items-start justify-center pt-16 min-h-[60vh]">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-sm p-8 text-center">
        {/* Icon */}
        <div className="w-14 h-14 bg-[#E8192C]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-[#E8192C]" />
        </div>

        {/* Heading */}
        <h2 className="font-chewy text-2xl text-gray-900 mb-1">{title} Locked</h2>
        <p className="text-gray-400 text-sm font-[Montserrat] mb-7">
          Enter 4-digit PIN to access
        </p>

        {/* 4 digit boxes */}
        <div className="flex justify-center gap-3 mb-5">
          {digits.map((d, i) => (
            <input
              key={i}
              id={`ochel-pin-${i}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                border-gray-200 focus:border-[#E8192C] focus:ring-2 focus:ring-[#E8192C]/20 text-gray-900
                disabled:opacity-50"
              disabled={checking}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-500 text-sm font-[Montserrat] mb-4 min-h-[20px]">
            {error}
          </p>
        )}
        {!error && <div className="mb-4 min-h-[20px]" />}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/admin/orders")}
            disabled={checking}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-[Montserrat]
              font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => submitPin(currentPin)}
            disabled={currentPin.length !== 4 || checking}
            className="flex-1 py-2.5 rounded-xl bg-[#E8192C] text-white text-sm font-[Montserrat]
              font-semibold hover:bg-[#c8151f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? "Checking…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
