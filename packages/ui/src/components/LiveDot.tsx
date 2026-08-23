import React from "react";

interface LiveDotProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LiveDot({ size = "md", className = "" }: LiveDotProps) {
  const sizes = { sm: "w-1.5 h-1.5", md: "w-2 h-2", lg: "w-2.5 h-2.5" };
  return (
    <span className={`inline-block rounded-full bg-red-500 animate-pulse ${sizes[size]} ${className}`} />
  );
}

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white tracking-wide">
      <LiveDot size="sm" />
      {label}
    </span>
  );
}
