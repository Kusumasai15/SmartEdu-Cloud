import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const sizeClasses = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold border border-primary/20 select-none",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span>{initials}</span>
    </div>
  );
}
