"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function MobilePageHeader({
  title,
  subtitle,
  backHref,
  onBack,
  action,
  className,
}: MobilePageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div
      className={cn(
        "md:hidden sticky top-0 z-30 flex items-center justify-between px-3 py-2.5 bg-white/95 backdrop-blur-md border-b border-slate-200/80 -mx-3.5 sm:-mx-6 mb-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="p-1.5 -ml-1 text-slate-700 hover:text-slate-900 active:bg-slate-100 rounded-full transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-slate-900 truncate tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate -mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0 flex items-center gap-1 pl-2">
          {action}
        </div>
      )}
    </div>
  );
}
