import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, User, Lock, Mail, Phone, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import whiteLogo from "@assets/O'Chel_Logo_White_transparent_1778493177551.png";

type Tab = "login" | "signup";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("login");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    fullName: "", email: "", phone: "", password: "", confirmPassword: "",
  });

  const field =
    "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-4 py-3 text-sm font-[Montserrat] focus:outline-none bg-white transition-colors";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);
    if (error) return setError(error);
    navigate("/account");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (signupForm.password !== signupForm.confirmPassword) {
      return setError("Passwords do not match");
    }
    if (signupForm.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }
    setLoading(true);
    const { error } = await signUp(
      signupForm.email,
      signupForm.password,
      signupForm.fullName,
      signupForm.phone,
    );
    setLoading(false);
    if (error) return setError(error);
    setSuccess("Account created! Please check your email to confirm, then log in.");
    setTab("login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-[#E8192C] py-4 px-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
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
          {/* Tab switcher */}
          <div className="flex border-b border-gray-100">
            {(["login", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className={`flex-1 py-4 font-bold font-[Montserrat] text-sm transition-colors ${
                  tab === t
                    ? "text-[#E8192C] border-b-2 border-[#E8192C]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-[Montserrat]">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 font-[Montserrat]">
                {success}
              </div>
            )}

            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="font-chewy text-2xl text-gray-800 mb-1">Welcome back!</h2>
                <p className="text-gray-400 text-sm font-[Montserrat] mb-4">Sign in to your O'chel account</p>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" placeholder="Email address" required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                    className={`${field} pl-10`} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPwd ? "text" : "password"} placeholder="Password" required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                    className={`${field} pl-10 pr-10`} />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold py-3 rounded-xl font-[Montserrat] transition-colors disabled:opacity-60">
                  {loading ? "Signing in…" : "Sign In"}
                </button>

                <p className="text-center text-sm text-gray-400 font-[Montserrat]">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => setTab("signup")}
                    className="text-[#E8192C] font-semibold hover:underline">
                    Sign up
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <h2 className="font-chewy text-2xl text-gray-800 mb-1">Join O'chel Foods</h2>
                <p className="text-gray-400 text-sm font-[Montserrat] mb-4">
                  Create an account to track orders and earn referral rewards
                </p>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Full name" required
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm((f) => ({ ...f, fullName: e.target.value }))}
                    className={`${field} pl-10`} />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" placeholder="Email address" required
                    value={signupForm.email}
                    onChange={(e) => setSignupForm((f) => ({ ...f, email: e.target.value }))}
                    className={`${field} pl-10`} />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="tel" placeholder="Phone number (optional)"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm((f) => ({ ...f, phone: e.target.value }))}
                    className={`${field} pl-10`} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPwd ? "text" : "password"} placeholder="Password (min 6 chars)" required
                    value={signupForm.password}
                    onChange={(e) => setSignupForm((f) => ({ ...f, password: e.target.value }))}
                    className={`${field} pl-10 pr-10`} />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" placeholder="Confirm password" required
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    className={`${field} pl-10`} />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold py-3 rounded-xl font-[Montserrat] transition-colors disabled:opacity-60">
                  {loading ? "Creating account…" : "Create Account"}
                </button>

                <p className="text-center text-xs text-gray-400 font-[Montserrat]">
                  By signing up you agree to our Terms of Service
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
