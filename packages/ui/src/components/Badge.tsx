import React from "react";

type BadgeVariant = "green" | "yellow" | "red" | "sage" | "navy" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  green: "bg-[#3D6B35] text-white",
  yellow: "bg-[#D4E04A] text-[#1E3A1E]",
  red: "bg-red-500 text-white",
  sage: "bg-[#C8D5B0] text-[#1E3A1E]",
  navy: "bg-[#1A2744] text-white",
  outline: "border border-[#3D6B35]/30 text-[#3D6B35]",
};

export function Badge({ children, variant = "sage", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
