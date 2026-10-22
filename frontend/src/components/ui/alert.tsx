import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 [&>svg]:absolute [&>svg]:text-foreground [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11 text-xs",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive [&>svg]:text-destructive",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 [&>svg]:text-emerald-600",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 [&>svg]:text-amber-600",
        info: "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300 [&>svg]:text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", title, children, ...props }, ref) => {
    const Icon =
      variant === "destructive"
        ? AlertCircle
        : variant === "success"
        ? CheckCircle2
        : variant === "warning"
        ? AlertTriangle
        : Info;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="h-4 w-4" />
        <div>
          {title && <h5 className="font-semibold leading-none tracking-tight mb-1">{title}</h5>}
          <div className="text-xs [&_p]:leading-relaxed">{children}</div>
        </div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

export { Alert, alertVariants };
