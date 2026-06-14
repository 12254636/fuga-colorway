import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border transition duration-200 disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-accent",
        variant === "primary" &&
          "border-studio-accent bg-studio-accent text-black hover:bg-white",
        variant === "secondary" &&
          "border-studio-border bg-studio-card text-white hover:border-[#4A4A4A] hover:bg-[#1F1F1F]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-studio-muted hover:bg-studio-card hover:text-white",
        variant === "danger" &&
          "border-[#503030] bg-[#211515] text-[#F0B4B4] hover:border-[#805050]",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "icon" && "h-9 w-9 p-0",
        className
      )}
      {...props}
    />
  );
}
