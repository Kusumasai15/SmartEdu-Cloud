"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Sparkles, CheckCircle2, Lock, Cpu, Database } from "lucide-react";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  const steps = [
    { text: "Initializing UniFlow Academic Engine...", icon: Cpu },
    { text: "Securing Token & Role Privileges...", icon: Lock },
    { text: "Mounting Institutional Hierarchy...", icon: Database },
    { text: "Workspace Synchronized & Ready", icon: CheckCircle2 },
  ];

  useEffect(() => {
    // Check if splash already ran in this tab session
    const hasRun = typeof window !== "undefined" ? sessionStorage.getItem("uniflow_splash_shown") : null;
    if (hasRun) {
      setIsVisible(false);
      return;
    }

    const stepTimer1 = setTimeout(() => setLoadingStep(1), 320);
    const stepTimer2 = setTimeout(() => setLoadingStep(2), 700);
    const stepTimer3 = setTimeout(() => setLoadingStep(3), 1050);
    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("uniflow_splash_shown", "true");
      }
    }, 1450);

    return () => {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(finishTimer);
    };
  }, []);

  // Ambient floating particle coordinates
  const particles = [
    { id: 1, x: -140, y: -90, size: 4, delay: 0 },
    { id: 2, x: 130, y: -110, size: 3, delay: 0.2 },
    { id: 3, x: -160, y: 70, size: 5, delay: 0.4 },
    { id: 4, x: 150, y: 80, size: 4, delay: 0.1 },
    { id: 5, x: -70, y: -150, size: 3, delay: 0.3 },
    { id: 6, x: 80, y: 140, size: 3, delay: 0.5 },
  ];

  const CurrentStepIcon = steps[loadingStep]?.icon || Sparkles;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: "blur(6px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-slate-950 text-white select-none overflow-hidden"
        >
          {/* Layered Animated Ambient Mesh Auroras */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.25, 0.38, 0.25],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-slate-800/40 rounded-full blur-3xl pointer-events-none"
          />
          <motion.div
            animate={{
              scale: [1.15, 1, 1.15],
              opacity: [0.15, 0.28, 0.15],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/4 w-[420px] h-[420px] bg-slate-800/30 rounded-full blur-3xl pointer-events-none"
          />

          {/* Floating Constellation Dust Particles */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                animate={{
                  y: [p.y, p.y - 12, p.y],
                  opacity: [0.3, 0.85, 0.3],
                  scale: [0.9, 1.25, 0.9],
                }}
                transition={{
                  duration: 3 + (p.id % 2),
                  repeat: Infinity,
                  delay: p.delay,
                  ease: "easeInOut",
                }}
                style={{
                  transform: `translate(${p.x}px, ${p.y}px)`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                }}
                className="absolute rounded-full bg-slate-400 shadow-[0_0_8px_#94a3b8]"
              />
            ))}
          </div>

          {/* Center Brand Identity Glass Card */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center text-center px-8 py-7 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.4)] max-w-sm mx-4 space-y-6"
          >
            {/* Logo with Dual Concentric Orbital Rings */}
            <div className="relative flex items-center justify-center">
              {/* Outer Gyro Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
                className="absolute -inset-4 rounded-full border border-slate-500/25 border-dashed pointer-events-none"
              >
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-slate-400" />
              </motion.div>

              {/* Counter Inner Gyro Ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 11, ease: "linear" }}
                className="absolute -inset-2 rounded-full border border-slate-500/35 pointer-events-none"
              >
                <span className="absolute bottom-0 right-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
              </motion.div>

              {/* Pulsing Core Aurora */}
              <motion.div
                animate={{
                  scale: [1, 1.14, 1],
                  opacity: [0.35, 0.65, 0.35],
                }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                className="absolute -inset-2 rounded-2xl bg-slate-700/50 blur-md opacity-50"
              />

              {/* Official Brand Badge */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative h-20 w-20 rounded-2xl bg-white p-2.5 shadow-2xl flex items-center justify-center border border-white/30 overflow-hidden"
              >
                <img
                  src="/uniflow-logo.png"
                  alt="UniFlow"
                  className="w-full h-full object-contain"
                />
              </motion.div>
            </div>

            {/* Typography with Sub-heading Badge */}
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.45 }}
              className="space-y-1.5"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[11px] font-semibold tracking-wide">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                <span>Next-Gen Academic Cloud</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200">
                UniFlow
              </h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                University Learning & Examination OS
              </p>
            </motion.div>

            {/* Dynamic Interactive Progress Engine */}
            <div className="w-full space-y-3 pt-1">
              {/* Progress Track & Animated Glow Head */}
              <div className="relative h-2 w-full bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/80 shadow-inner">
                <motion.div
                  initial={{ width: "10%" }}
                  animate={{
                    width:
                      loadingStep === 0
                        ? "30%"
                        : loadingStep === 1
                        ? "62%"
                        : loadingStep === 2
                        ? "88%"
                        : "100%",
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="relative h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                >
                  {/* Glowing Laser Head at front of bar */}
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                </motion.div>
              </div>

              {/* Status Message with Active Step Icon */}
              <div className="flex items-center justify-center gap-2 min-h-[22px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={loadingStep}
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-300 font-mono tracking-tight"
                  >
                    <CurrentStepIcon className={`h-3.5 w-3.5 ${loadingStep === 3 ? "text-emerald-400" : "text-blue-400 animate-spin-slow"}`} />
                    <span>{steps[loadingStep]?.text}</span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
