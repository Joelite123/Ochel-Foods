import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import whiteLogo from "@assets/O'Chel_Logo_White_transparent_1778493177551.png";

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const field =
    "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-4 py-3 text-sm font-[Montserrat] focus:outline-none bg-white transition-colors";

  useEffect(() => {
    // Supabase sends the token as a hash fragment — it will fire PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setError(""); setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => navigate("/login"), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[#E8192C] py-4 px-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/login")}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={whiteLogo} alt="O'chel Foods" className="h-9 w-auto" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="p-6">
            {done ? (
              <div className="text-center py-6">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h2 className="font-chewy text-2xl text-gray-800 mb-2">Password Updated!</h2>
                <p className="text-gray-500 text-sm font-[Montserrat]">
                  Your password has been changed successfully. Redirecting you to sign in…
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#E8192C]/10 p-3 rounded-xl">
                    <Lock className="w-6 h-6 text-[#E8192C]" />
                  </div>
                  <div>
                    <h2 className="font-chewy text-2xl text-gray-800 leading-tight">Set New Password</h2>
                    <p className="text-gray-400 text-xs font-[Montserrat]">Choose a strong password for your account</p>
                  </div>
                </div>

                {!sessionReady && (
                  <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-xl px-4 py-3 font-[Montserrat]">
                    Verifying your reset link… if this message persists, please request a new link.
                  </div>
                )}

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-[Montserrat]">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="New password (min 6 chars)"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${field} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={`${field} pl-10`}
                    />
                  </div>

                  {password && confirm && (
                    <p className={`text-xs font-[Montserrat] ${password === confirm ? "text-green-600" : "text-red-500"}`}>
                      {password === confirm ? "✓ Passwords match" : "Passwords do not match"}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !sessionReady}
                    className="w-full bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold py-3 rounded-xl font-[Montserrat] transition-colors disabled:opacity-60"
                  >
                    {loading ? "Updating password…" : "Update Password"}
                  </button>

                  <p className="text-center text-sm font-[Montserrat]">
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="text-[#E8192C] font-semibold hover:underline"
                    >
                      ← Back to Sign In
                    </button>
                  </p>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
