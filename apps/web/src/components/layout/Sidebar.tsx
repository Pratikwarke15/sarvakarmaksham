"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";
import type { LucideIcon } from "lucide-react";

export interface SidebarLink {
  href: string;
  label: string;
  key?: string;
  icon: LucideIcon;
}

interface SidebarProps {
  links: SidebarLink[];
}

export function Sidebar({ links }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useI18n();

  const getLabel = (link: SidebarLink) => {
    if (link.key) {
      const translated = t(`nav.${link.key}`);
      if (translated && translated !== `nav.${link.key}`) return translated;
    }
    // Attempt standard nav keys:
    const keyCandidate = link.label.toLowerCase().replace(/\s+/g, "");
    const directLookup = t(`nav.${keyCandidate}`);
    if (directLookup && directLookup !== `nav.${keyCandidate}`) return directLookup;
    return link.label;
  };

  return (
    <aside
      className={cn(
        "sticky top-16 hidden h-[calc(100vh-4rem)] border-r bg-white transition-all duration-300 lg:block",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-1 p-2">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            const label = getLabel(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center border-t p-3 text-gray-400 hover:text-gray-600"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
