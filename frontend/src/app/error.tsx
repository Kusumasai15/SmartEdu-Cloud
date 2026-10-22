"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error boundary triggered:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto my-12 text-center">
      <Card className="p-6 shadow-float border-destructive/20">
        <CardHeader className="pb-3">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-extrabold text-foreground">
            Application Error
          </CardTitle>
          <CardDescription className="text-xs">
            We encountered an unexpected error while rendering this view.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 border-t border-border mt-4 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>
            <Home className="h-3.5 w-3.5 mr-1.5" />
            Home
          </Button>
          <Button variant="default" size="sm" onClick={() => reset()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
