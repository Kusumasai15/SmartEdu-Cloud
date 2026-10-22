"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant,
  isDestructive,
  isLoading = false,
}: ConfirmDialogProps) {
  const finalConfirm = confirmLabel || confirmText || "Confirm";
  const finalCancel = cancelLabel || cancelText || "Cancel";
  const finalVariant = variant || (isDestructive ? "destructive" : "default");

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex items-start gap-3">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
            finalVariant === "destructive"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-1 flex-1">
          <h4 className="text-sm font-bold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-border">
        <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading} className="rounded-xl font-bold">
          {finalCancel}
        </Button>
        <Button
          variant={finalVariant}
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className="rounded-xl font-bold"
        >
          {finalConfirm}
        </Button>
      </div>
    </Dialog>
  );
}
