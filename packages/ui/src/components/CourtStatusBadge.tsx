import React from "react";
import type { CourtStatus } from "@courtroom/types";

interface CourtStatusBadgeProps {
  status: CourtStatus;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const config: Record<CourtStatus, { dot: string; bg: string; text: string; label: string }> = {
  LIVE: { dot: "bg-red-500 animate-pulse", bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Live" },
  AVAILABLE: { dot: "bg-green-500", bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Available" },
  BREAK: { dot: "bg-amber-500", bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Break" },
  MAINTENANCE: { dot: "bg-gray-400", bg: "bg-gray-50 border-gray-200", text: "text-gray-600", label: "Maintenance" },
};

export function CourtStatusBadge({ status, showLabel = true, size = "md" }: CourtStatusBadgeProps) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full font-semibold ${c.bg} ${c.text} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {showLabel && c.label}
    </span>
  );
}
