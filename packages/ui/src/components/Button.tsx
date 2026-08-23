import React from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "score-green" | "score-navy";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#3D6B35] text-white hover:bg-[#4E8A44] shadow-sm",
  secondary: "bg-[#D4E04A] text-[#1E3A1E] hover:bg-[#E8F06A] shadow-sm",
  outline: "border border-[#3D6B35]/30 text-[#3D6B35] hover:bg-[#3D6B35] hover:text-white",
  ghost: "text-[#3D6B35] hover:bg-[#C8D5B0]/30",
  danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
  "score-green": "bg-[#3D6B35] text-white hover:bg-[#4E8A44] active:scale-95 shadow-lg text-2xl font-bold",
  "score-navy": "bg-[#1A2744] text-white hover:bg-[#243560] active:scale-95 shadow-lg text-2xl font-bold",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
  xl: "px-8 py-6 text-2xl rounded-2xl w-full",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-150 select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
}
