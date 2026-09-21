"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { LOCALES, useI18n, Locale } from "@/i18n/I18nProvider";

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  const selected = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={t("language.select")}
        className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/80 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs hover:border-orange-400 hover:bg-orange-100/80 transition-all focus:outline-hidden focus:ring-2 focus:ring-orange-500/40"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-white text-[9px] shadow-2xs font-bold">
          🌐
        </span>
        <span className="font-semibold text-slate-800">{selected.native}</span>
        <span className="text-[10px] font-bold text-orange-600 bg-white px-1 py-0.5 rounded border border-orange-200 uppercase">
          {selected.code}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-fade-in">
            <div className="px-2 py-1 border-b border-slate-100 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Choose Language / भाषा
              </span>
            </div>
            {LOCALES.map((lang) => {
              const isCurrent = locale === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLocale(lang.code as Locale);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    isCurrent
                      ? "bg-orange-50 text-orange-950 font-bold border border-orange-300 shadow-2xs"
                      : "text-slate-700 hover:bg-slate-50 hover:text-orange-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${isCurrent ? "bg-emerald-600 ring-2 ring-emerald-200" : "bg-slate-300"}`} />
                    <span className="text-sm">{lang.native}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCurrent ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {lang.name}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default LanguageSelector;
