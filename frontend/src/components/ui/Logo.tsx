"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
  animate?: boolean;
}

export function Logo({
  size = "md",
  className,
  showText = true,
  animate = true,
}: LogoProps) {
  const sizeMap = {
    sm: { icon: "h-7 w-7", text: "text-sm", sub: "text-[9px]" },
    md: { icon: "h-9 w-9", text: "text-base", sub: "text-[10px]" },
    lg: { icon: "h-12 w-12", text: "text-xl", sub: "text-xs" },
    xl: { icon: "h-16 w-16", text: "text-2xl", sub: "text-sm" },
  };

  const { icon, text, sub } = sizeMap[size];

  const IconWrapper = animate ? motion.div : "div";
  const iconProps = animate
    ? {
        whileHover: { scale: 1.06, rotate: 2 },
        whileTap: { scale: 0.95 },
        transition: { type: "spring", stiffness: 400, damping: 17 },
      }
    : {};

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <IconWrapper
        {...(iconProps as any)}
        className={cn(
          "relative flex items-center justify-center rounded-2xl bg-white shadow-md shadow-indigo-500/10 border border-slate-200/80 overflow-hidden shrink-0",
          icon
        )}
      >
        <img
          src="/uniflow-logo.png"
          alt="UniFlow Logo"
          className="w-full h-full object-contain p-0.5"
        />
      </IconWrapper>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-black tracking-tight text-foreground flex items-center gap-1.5",
              text
            )}
          >
            UniFlow
            <span className="font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] border border-primary/20">
              LMS
            </span>
          </span>
          <span className={cn("text-muted-foreground font-medium mt-0.5", sub)}>
            University Learning Management System
          </span>
        </div>
      )}
    </div>
  );
}
