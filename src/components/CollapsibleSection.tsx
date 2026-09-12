"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleSection({
  icon,
  title,
  badgeClass,
  summary,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badgeClass: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-obsidian-800/40 sm:px-5"
      >
        <span className={`section-badge shrink-0 ${badgeClass}`}>
          {icon}
          {title}
        </span>
        <span className="hidden min-w-0 flex-1 truncate font-mono text-[11px] text-text-muted sm:block">
          {summary}
        </span>
        <ChevronDown
          size={16}
          className={`ml-auto shrink-0 text-text-muted transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="border-t border-obsidian-600/40 p-4 sm:p-5">{children}</div>}
    </section>
  );
}
