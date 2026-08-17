"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

export function Popover({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>{children}</PopoverPrimitive.Root>;
}

export function PopoverTrigger({ children, asChild = false }: { children: React.ReactNode; asChild?: boolean }) {
  return <PopoverPrimitive.Trigger asChild={asChild}>{children}</PopoverPrimitive.Trigger>;
}

export function PopoverContent({
  children,
  className = "",
  side = "right",
  align = "start",
}: {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        side={side}
        align={align}
        sideOffset={10}
        collisionPadding={16}
        className={`z-50 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,.18)] outline-none ${className}`}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}
