import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "white" | "dark" | "cream" | "green";
  hover?: boolean;
  onClick?: () => void;
}

const variants = {
  white: "bg-white border border-[#C8D5B0]/30 shadow-[0_4px_24px_rgba(61,107,53,0.1)]",
  dark: "bg-[#1E3A1E] text-white",
  cream: "bg-[#F5F0E8] border border-[#C8D5B0]/40",
  green: "bg-[#3D6B35] text-white",
};

export function Card({ children, className = "", variant = "white", hover = false, onClick }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl overflow-hidden
        ${variants[variant]}
        ${hover ? "transition-shadow duration-200 hover:shadow-[0_8px_40px_rgba(61,107,53,0.2)] cursor-pointer" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-[#C8D5B0]/20 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-t border-[#C8D5B0]/20 ${className}`}>{children}</div>;
}
