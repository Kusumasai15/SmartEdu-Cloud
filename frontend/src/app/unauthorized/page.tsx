"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, ArrowRight, UserCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg mx-auto my-16 px-4">
      <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <CardHeader className="pb-3">
          <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200 dark:border-amber-800">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            Workspace Restricted
          </CardTitle>
          <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Your current account role ({user?.role?.name || "User"}) does not have direct access to this section. Choose your active workspace below.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link href="/admin" className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-medium flex items-center justify-between">
              <span>Admin Console</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
            <Link href="/vc" className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-medium flex items-center justify-between">
              <span>VC Workspace</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
            <Link href="/hod" className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-medium flex items-center justify-between">
              <span>HOD Workspace</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
            <Link href="/faculty" className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-medium flex items-center justify-between">
              <span>Faculty Workspace</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
          </div>

          <div className="pt-2">
            <Link href="/student">
              <Button className="w-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white">
                <span>Go to Student Workspace</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
