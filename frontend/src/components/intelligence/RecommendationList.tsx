"use client";

import React from "react";
import {
  Compass,
  CheckCircle2,
  Calendar,
  BookOpen,
  ArrowRight,
  Target,
  Clock,
  Sparkles,
} from "lucide-react";
import { ActionableRecommendation } from "@/types";

interface RecommendationListProps {
  recommendations: ActionableRecommendation[];
}

export const RecommendationList: React.FC<RecommendationListProps> = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">
            Personalized Academic Action Plan ({recommendations.length})
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">Actionable Interventions</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="saas-card flex flex-col justify-between gap-3 group hover:border-primary/40 transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase font-mono">
                  Priority {rec.priority}
                </span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  {rec.category}
                </span>
              </div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                {rec.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {rec.recommendation}
              </p>
            </div>

            {rec.target_metric && (
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Target Metric</span>
                <span className="font-semibold text-primary font-mono">{rec.target_metric}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
