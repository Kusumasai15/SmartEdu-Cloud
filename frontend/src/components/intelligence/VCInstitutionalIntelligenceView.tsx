"use client";

import React from "react";
import { BarChart3, Users } from "lucide-react";
import { VCInstitutionalIntelligenceResponse } from "@/types";

interface VCInstitutionalIntelligenceViewProps {
  data: VCInstitutionalIntelligenceResponse | null;
  loading?: boolean;
}

export function VCInstitutionalIntelligenceView({ data, loading }: VCInstitutionalIntelligenceViewProps) {
  if (loading) {
    return <div className="min-h-48 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          {data ? <BarChart3 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Institutional Analytics</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {data
            ? "Verified institutional analytics are available through the summary panels on this page. Forecasts are not shown until an approved analytics model and measured source data are connected."
            : "Analytics will appear after attendance, results, enrollment, and research records are available from the university database."}
        </p>
      </div>
    </section>
  );
}
