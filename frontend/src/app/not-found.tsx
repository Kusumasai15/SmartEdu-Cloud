import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto my-12 text-center">
      <Card className="p-6 shadow-float border-border">
        <CardHeader className="pb-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Compass className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-extrabold text-foreground">
            404 — Page Not Found
          </CardTitle>
          <CardDescription className="text-xs">
            The requested academic resource or page could not be located on the platform.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 border-t border-border mt-4">
          <Link href="/">
            <Button variant="default" size="sm" className="gap-2">
              <Home className="h-3.5 w-3.5" />
              Return to Homepage
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
