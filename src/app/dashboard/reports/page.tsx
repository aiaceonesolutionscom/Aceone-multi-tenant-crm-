"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ReportsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/leads");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      <p className="text-xs font-medium">Redirecting to Leads Management...</p>
    </div>
  );
}
