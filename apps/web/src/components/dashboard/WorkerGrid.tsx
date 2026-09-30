import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle, Ban, MessageSquare, ShieldCheck } from "lucide-react";
import type { WorkerProfile } from "@/lib/types";
import { getStatusColor } from "@/lib/utils";

interface WorkerGridProps {
  workers: WorkerProfile[];
  onVerify?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onMessage?: (id: string) => void;
}

export function WorkerGrid({ workers, onVerify, onSuspend, onMessage }: WorkerGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workers.map((w) => (
        <div key={w.id} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 font-black text-[#800020] border border-rose-200/70 shadow-sm shrink-0">
              {w.user?.name?.charAt(0).toUpperCase() || "W"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="truncate text-sm font-bold text-slate-900 font-heading">{w.user?.name || "Technician"}</h4>
                {w.status === "VERIFIED" && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-slate-700">{w.avgRating ? w.avgRating.toFixed(1) : "5.0"}</span>
                <span className="text-xs text-slate-400">· {w.totalJobs ?? 0} jobs</span>
              </div>
            </div>
            <Badge className={getStatusColor(w.status)}>{w.status.replace("_", " ")}</Badge>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {w.skillTags?.slice(0, 3).map((t) => (
              <span key={t} className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-rose-50/70 text-[#800020] border border-rose-100">
                {t}
              </span>
            ))}
            {(!w.skillTags || w.skillTags.length === 0) && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                Certified Artisan
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              {onVerify && w.status === "PENDING_VERIFICATION" && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold" onClick={() => onVerify(w.id)}>
                  <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                </Button>
              )}
              {onSuspend && w.status === "VERIFIED" && (
                <Button size="sm" variant="danger" className="rounded-xl text-xs font-semibold" onClick={() => onSuspend(w.id)}>
                  <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                </Button>
              )}
            </div>
            {onMessage && (
              <Button size="sm" variant="ghost" className="rounded-xl text-slate-500 hover:text-[#800020] hover:bg-rose-50" onClick={() => onMessage(w.id)}>
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
