import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, User, Lock, Mail, Phone, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import whiteLogo from "@assets/O'Chel_Logo_White_transparent_1778493177551.png";

type Tab = "login" | "signup" | "forgot";

export default function LoginPage() {
  const { signIn, signUp, resetPasswordForEmail, user, profile } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("login");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [awaitingRedirect, setAwaitingRedirect] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Read ?next= param from URL (set by AdminGuard when redirecting to login)
  const nextPath = new URLSearchParams(window.location.search).get("next") || "";

  // Once user + profile both load after a successful login, navigate to the right place
  useEffect(() => {
    if (!awaitingRedirect || !user) return;
    // If profile hasn't loaded yet, wait — it comes via onAuthStateChange async
    // But if nextPath is set (admin was trying to reach an admin page), honour it
    if (nextPath) {
      navigate(nextPath);
      return;
    }
    // For normal login, wait for profile to determine role
    if (profile) {
      navigate(profile.role === "admin" ? "/admin" : "/account");
    }
    // If profile is still null after 2 s (no profile row), just go to /account
  }, [awaitingRedirect, user, profile, nextPath]);

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
    // Trigger the smart redirect in useEffect above (waits for profile to load)
    setAwaitingRedirect(true);
    // Fallback: if profile never loads (no row in DB), go to /account after 3 s
    setTimeout(() => navigate(nextPath || "/account"), 3000);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return setError("Please enter your email address");
    setError(""); setLoading(true);
    const { error } = await resetPasswordForEmail(forgotEmail.trim());
    setLoading(false);
    if (error) return setError(error);
    setSuccess("If an account with that email exists, a password reset link has been sent. Check your inbox.");
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
          {/* Tab switcher — hidden on forgot view */}
          {tab !== "forgot" && (
            <div className="flex border-b border-gray-100">
              {(["login", "signup"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t as Tab); setError(""); setSuccess(""); }}
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
          )}

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

            {tab === "forgot" ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-[#E8192C]/10 p-3 rounded-xl">
                    <Mail className="w-6 h-6 text-[#E8192C]" />
                  </div>
                  <div>
                    <h2 className="font-chewy text-2xl text-gray-800 leading-tight">Forgot Password?</h2>
                    <p className="text-gray-400 text-xs font-[Montserrat]">We'll send a reset link to your email</p>
                  </div>
                </div>

                {!success && (
                  <p className="text-gray-500 text-sm font-[Montserrat] leading-relaxed">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                )}

                {success ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 font-[Montserrat]">
                    <p className="text-green-700 text-sm font-semibold mb-1">Check your inbox!</p>
                    <p className="text-green-600 text-sm">{success}</p>
                  </div>
                ) : (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      placeholder="Email address"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className={`${field} pl-10`}
                    />
                  </div>
                )}

                {!success && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold py-3 rounded-xl font-[Montserrat] transition-colors disabled:opacity-60"
                  >
                    {loading ? "Sending…" : "Send Reset Link"}
                  </button>
                )}

                <p className="text-center text-sm font-[Montserrat]">
                  <button
                    type="button"
                    onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
                    className="text-[#E8192C] font-semibold hover:underline"
                  >
                    ← Back to Sign In
                  </button>
                </p>
              </form>
            ) : tab === "login" ? (
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

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setTab("forgot"); setError(""); setSuccess(""); setForgotEmail(loginForm.email); }}
                    className="text-xs text-[#E8192C] font-semibold font-[Montserrat] hover:underline"
                  >
                    Forgot Password?
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
            ) : tab === "signup" ? (
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
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
