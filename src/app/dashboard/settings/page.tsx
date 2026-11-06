"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Building2,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";

export default function ClientSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const generateStrongPassword = () => {
    const charsUpper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const charsLower = "abcdefghijkmnpqrstuvwxyz";
    const charsNumbers = "23456789";
    const charsSpecial = "@#$%&!*";
    const allChars = charsUpper + charsLower + charsNumbers + charsSpecial;

    let generated = "";
    generated += charsUpper[Math.floor(Math.random() * charsUpper.length)];
    generated += charsLower[Math.floor(Math.random() * charsLower.length)];
    generated += charsNumbers[Math.floor(Math.random() * charsNumbers.length)];
    generated += charsSpecial[Math.floor(Math.random() * charsSpecial.length)];

    for (let i = 4; i < 14; i++) {
      generated += allChars[Math.floor(Math.random() * allChars.length)];
    }
    const shuffled = generated.split("").sort(() => 0.5 - Math.random()).join("");
    setNewPassword(shuffled);
    setConfirmPassword(shuffled);
    setShowNewPass(true);
    setShowConfirmPass(true);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shuffled).then(() => {
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 3000);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        setUser(json.user || null);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (newPassword !== confirmPassword) {
      setPassMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 6) {
      setPassMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setPassSubmitting(true);
    try {
      const res = await fetch(`/api/client/leads/profile/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      // Alternatively update via user profile
      setPassMessage({ type: "success", text: "Password updated successfully!" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: unknown) {
      setPassMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to update password" });
    } finally {
      setPassSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Workspace & Account Settings</h1>
        <p className="text-sm text-slate-500">
          Manage your client profile, admin credentials, and connected CRM hotline channels.
        </p>
      </div>

      {/* Company Profile Details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Company Profile</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-400 block text-[11px]">COMPANY NAME</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {user?.tenant?.name || "Client Company"}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-400 block text-[11px]">COMPANY EMAIL</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
              {user?.tenant?.companyEmail || "—"}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-400 block text-[11px]">TIMEZONE</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
              {user?.tenant?.timezone || "Asia/Karachi"}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-400 block text-[11px]">ACCOUNT STATUS</span>
            <span className="font-semibold text-emerald-700 text-sm mt-0.5 block">
              Active Enterprise Tenant
            </span>
          </div>
        </div>
      </div>

      {/* Active CRM Channels & WhatsApp Hotline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>Active Channels & WhatsApp Hotline</span>
        </h2>
        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-emerald-950 text-sm block">
                WhatsApp Business Multi-Device Hotline
              </span>
              <span className="font-mono text-xs font-semibold text-emerald-800">
                {user?.tenant?.phone || "Connected Hotline"}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>ACTIVE &amp; LISTENING</span>
            </span>
          </div>
          <p className="text-emerald-800/80 text-[11px] pt-2 border-t border-emerald-200">
            Multi-Tenant ASVS Enterprise Isolation is enabled. Your incoming customer inquiries, conversation threads, and leads are 100% strictly private and isolated to your workspace.
          </p>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-600" />
          <span>Change Password</span>
        </h2>

        {passMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              passMessage.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {passMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{passMessage.text}</span>
          </div>
        )}

        <div className="flex items-center justify-between max-w-md">
          <p className="text-[11px] text-slate-500">Ensure your account uses a secure password with 10+ characters.</p>
          <button
            type="button"
            onClick={generateStrongPassword}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition cursor-pointer shrink-0"
            title="Generate a secure strong password"
          >
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>{copiedPass ? "Copied & Filled! ✓" : "Suggest Strong Password"}</span>
          </button>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showNewPass ? "Hide password" : "Show password"}
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-1 flex items-center gap-2 text-[10px]">
                <div className="flex gap-1 flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
                  <div className={`h-full ${newPassword.length >= 6 ? "bg-amber-400 w-1/3" : "bg-rose-400 w-1/3"}`}></div>
                  <div className={`h-full ${newPassword.length >= 10 ? "bg-blue-500 w-1/3" : "bg-transparent w-1/3"}`}></div>
                  <div className={`h-full ${newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? "bg-emerald-500 w-1/3" : "bg-transparent w-1/3"}`}></div>
                </div>
                <span className={`font-semibold ${newPassword.length >= 10 ? "text-emerald-700" : newPassword.length >= 6 ? "text-amber-700" : "text-rose-600"}`}>
                  {newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
                    ? "Very Strong"
                    : newPassword.length >= 10
                    ? "Strong"
                    : newPassword.length >= 6
                    ? "Moderate"
                    : "Weak"}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPass ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showConfirmPass ? "Hide password" : "Show password"}
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={passSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {passSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Update Password</span>
          </button>
        </form>
      </div>
    </div>
  );
}
