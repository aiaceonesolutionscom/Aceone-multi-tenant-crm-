"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean URL if opened via GET parameters
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      const sp = new URLSearchParams(window.location.search);
      const id = sp.get("identifier");
      const pass = sp.get("password");
      if (id) setIdentifier(id);
      if (pass) setPassword(pass);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid username or password");
      }

      window.location.href = data.redirectUrl || "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during authentication");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden w-full flex flex-col lg:flex-row bg-[#1a2332] selection:bg-cyan-500 selection:text-slate-900">
      {/* ----------------------------------------------------------------- */}
      {/* LEFT SIDE: Full-Bleed Original Graphic (100% Original Artwork)     */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative flex-1 bg-white overflow-hidden min-h-[380px] lg:min-h-0 lg:h-full select-none">
        <Image
          src="/login-banner.png"
          alt="Closify CRM Platform"
          fill
          className="object-cover object-left lg:object-center"
          priority
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* RIGHT SIDE: Dark Modern Login Panel (Exact Reference & Layout)    */}
      {/* ----------------------------------------------------------------- */}
      <div className="w-full lg:w-[440px] xl:w-[480px] bg-[#1a2332] text-white flex flex-col justify-between p-5 sm:p-7 lg:px-9 lg:py-6 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800">
        <div className="my-auto w-full max-w-xs sm:max-w-sm mx-auto">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white">LOGIN</h1>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Enter your credentials to access Closify CRM
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-3.5 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Username or Email */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-[10.5px] font-bold text-slate-300 uppercase tracking-wider mb-1"
              >
                Email or Username
              </label>
              <div className="relative">
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@company.com or username"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#222e42] border border-slate-700/80 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-[10.5px] font-bold text-slate-300 uppercase tracking-wider mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 pr-9 text-xs bg-[#222e42] border border-slate-700/80 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center text-[11px] pt-0.5">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-[#222e42] border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-400"
                />
                <span>Remember me</span>
              </label>
            </div>

            {/* Primary Action Button (Vibrant Cyan Button as in Reference) */}
            <div className="pt-1.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#00d2ff] hover:bg-[#00bfe6] active:scale-[0.99] text-slate-950 font-bold text-xs tracking-wide shadow-md shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bottom Link */}
          <div className="mt-4 text-center text-xs text-slate-400">
            <span>Need an account or workspace? </span>
            <a
              href="https://aceonesolutions.com"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline font-semibold"
            >
              Contact AceOne Solutions
            </a>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[9.5px] text-slate-500 pt-2">
          Closify CRM &copy; {new Date().getFullYear()} &bull; Enterprise Infrastructure by @aceone solutions
        </div>
      </div>
    </div>
  );
}
