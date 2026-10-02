"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

function BookRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve query parameters (e.g. ?category=plumbing or ?service=electrical)
    const queryString = searchParams?.toString();
    const destination = queryString
      ? `/consumer/problem-selection?${queryString}`
      : "/consumer/problem-selection";
    
    // Immediate redirect to new database-driven problem selection flow
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
      <div className="h-16 w-16 mx-auto rounded-3xl bg-[#800020]/10 text-[#800020] flex items-center justify-center">
        <Sparkles className="h-8 w-8 animate-pulse" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-slate-900 font-heading">
          Redirecting to Problem Selection...
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          We have upgraded the service booking experience to our new 5-step problem selection flow with audio/text explanation and transparent pricing.
        </p>
      </div>

      <div className="pt-2">
        <Link
          href="/consumer/problem-selection"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white px-6 py-3 text-xs font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all"
        >
          <span>Continue to Problem Selection</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function BookServicePage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
          <p className="text-xs text-slate-500">Redirecting to Problem Selection...</p>
        </div>
      }
    >
      <BookRedirectContent />
    </Suspense>
  );
}
