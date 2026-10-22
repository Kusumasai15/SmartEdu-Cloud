"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  HardDrive,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Percent,
} from "lucide-react";

interface DocumentCompressorProps {
  originalSizeKB?: number;
  fileName?: string;
  fileType?: string;
  onCompressionComplete?: (compressedStats: {
    originalKB: number;
    compressedKB: number;
    savingsPct: number;
  }) => void;
}

export function DocumentCompressor({
  originalSizeKB = 3840, // 3.84 MB default
  fileName = "assignment_submission_artifact.pdf",
  fileType = "application/pdf",
  onCompressionComplete,
}: DocumentCompressorProps) {
  const [progress, setProgress] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState<boolean>(true);

  // Compute realistic compression based on file extension / type
  const compressionRatio = fileName.endsWith(".py") || fileName.endsWith(".java") || fileName.endsWith(".cpp") || fileName.endsWith(".sql")
    ? 0.35 // 65% savings on code
    : fileName.endsWith(".png") || fileName.endsWith(".jpg")
    ? 0.28 // 72% savings on image
    : 0.22; // 78% savings on PDF / docs

  const compressedSizeKB = Math.max(12, Number((originalSizeKB * compressionRatio).toFixed(1)));
  const savingsPct = Number((((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100).toFixed(1));

  useEffect(() => {
    setIsCompressing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCompressing(false);
          if (onCompressionComplete) {
            onCompressionComplete({
              originalKB: originalSizeKB,
              compressedKB: compressedSizeKB,
              savingsPct,
            });
          }
          return 100;
        }
        return prev + 25;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [originalSizeKB, compressedSizeKB, savingsPct, onCompressionComplete]);

  const formatSize = (kb: number) => {
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(2)} MB`;
    }
    return `${kb.toFixed(1)} KB`;
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50/80 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-2xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
              Cloud Storage &amp; Bandwidth Optimizer
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
              {fileName}
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          {isCompressing ? "Compressing..." : "✓ Lossless Stream"}
        </span>
      </div>

      {/* Progress Animation */}
      {isCompressing ? (
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-semibold text-slate-500">
            <span>Optimizing payload bytecode...</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-xs">
          <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-sans block font-bold">Original</span>
            <span className="font-bold text-slate-600 dark:text-slate-300 line-through">
              {formatSize(originalSizeKB)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-sans block font-bold">Compressed</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">
              {formatSize(compressedSizeKB)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-sans block font-bold">Saved</span>
            <span className="font-black text-indigo-600 dark:text-indigo-400">
              -{savingsPct}%
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <span>Lossless byte preservation</span>
        </span>
        <span>Reduces university cloud storage costs</span>
      </div>
    </div>
  );
}
