"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Cpu,
  Sliders,
  Shield,
  Save,
  Zap,
  RefreshCw,
  AlertTriangle,
  Bot,
  BrainCircuit,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AIAdministrationView() {
  const [activeModel, setActiveModel] = useState("academic-advisor");
  const [attendanceWeight, setAttendanceWeight] = useState(40);
  const [midtermWeight, setMidtermWeight] = useState(35);
  const [assignmentWeight, setAssignmentWeight] = useState(25);
  const [autoCounselorDispatch, setAutoCounselorDispatch] = useState(true);
  const [strictPrivacy, setStrictPrivacy] = useState(true);
  const [proctoringSensitivity, setProctoringSensitivity] = useState("HIGH");
  const [notification, setNotification] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveConfig = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast("✓ Student Performance Advisor settings updated across all departments.");
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {notification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#22B573]" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#171A2B] dark:text-white flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-slate-900 dark:text-slate-100" />
            <span>Student Performance Advisor &amp; Early Warning System</span>
          </h2>
          <p className="text-xs text-[#737A90]">
            Configure student support alerts, attendance risk calculations, and student privacy rules.
          </p>
        </div>

        <Button
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="btn-saas-primary text-xs font-bold px-5 py-2 shadow-xs cursor-pointer"
        >
          <Save className="h-4 w-4 mr-1.5" />
          <span>{isSaving ? "Saving..." : "Save Settings"}</span>
        </Button>
      </div>

      {/* Primary Learning Support Service */}
      <Card className="border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B]">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
            <Bot className="h-4 w-4 text-slate-900 dark:text-slate-100" />
            <span>Primary Learning Support Service</span>
          </CardTitle>
          <CardDescription className="text-xs text-[#737A90]">
            Select the support service used for guided tutoring, study help, and early academic advice for students.
          </CardDescription>
        </CardHeader>

        <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              id: "academic-advisor",
              name: "Academic Advisor",
              speed: "Fast Response",
              capability: "Coursework & Tutor",
              badge: "Recommended",
              status: "Active",
            },
            {
              id: "claude-3.5-sonnet",
              name: "Advanced Study Advisor",
              speed: "Detailed Explanations",
              capability: "Complex Problem Solving",
              badge: "High Reasoning",
              status: "Available",
            },
            {
              id: "campus-private-advisor",
              name: "Campus Private Advisor",
              speed: "Local Campus Network",
              capability: "Maximum Privacy",
              badge: "On-Campus Only",
              status: "Ready",
            },
          ].map((m) => (
            <div
              key={m.id}
              onClick={() => {
                setActiveModel(m.id);
                showToast(`✓ Active support service switched to ${m.name}`);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                activeModel === m.id
                  ? "border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800/40 dark:bg-slate-100 dark:bg-slate-800 shadow-xs"
                  : "border-[#E8EAF1] dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-[#E8EAF1] dark:border-slate-700">
                  {m.badge}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    activeModel === m.id ? "text-[#22B573]" : "text-[#737A90]"
                  }`}
                >
                  ● {activeModel === m.id ? "Selected" : "Standby"}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#171A2B] dark:text-white">{m.name}</h4>
                <p className="text-[11px] text-[#737A90] mt-0.5">{m.speed} • {m.capability}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Early-Warning Risk Weight Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B]">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
              <Sliders className="h-4 w-4 text-slate-900 dark:text-slate-100" />
              <span>Academic Risk Calculation Weights</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#737A90]">
              Adjust how attendance, midterm exams, and assignments contribute to early warning risk scores. Total:{" "}
              <strong className="text-slate-900 dark:text-slate-100 font-mono font-bold">
                {attendanceWeight + midtermWeight + assignmentWeight}%
              </strong>
            </CardDescription>
          </CardHeader>

          <div className="p-5 pt-0 space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-[#171A2B] dark:text-white">
                <span>Lecture Attendance Weight</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{attendanceWeight}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={70}
                value={attendanceWeight}
                onChange={(e) => setAttendanceWeight(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-[#171A2B] dark:text-white">
                <span>Mid-Semester Exam Score Weight</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{midtermWeight}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={70}
                value={midtermWeight}
                onChange={(e) => setMidtermWeight(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-[#171A2B] dark:text-white">
                <span>Homework &amp; Lab Practical Weight</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{assignmentWeight}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={70}
                value={assignmentWeight}
                onChange={(e) => setAssignmentWeight(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>
          </div>
        </Card>

        {/* Student Support & Proctoring Controls */}
        <Card className="border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B]">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
              <Shield className="h-4 w-4 text-[#22B573]" />
              <span>Student Support &amp; Privacy Safeguards</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#737A90]">
              Automated notifications to faculty mentors and student privacy protection rules.
            </CardDescription>
          </CardHeader>

          <div className="p-5 pt-0 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-900/60 border border-[#E8EAF1] dark:border-slate-800">
              <div>
                <span className="font-bold text-[#171A2B] dark:text-white block">Automatic Mentor Notification</span>
                <p className="text-[11px] text-[#737A90]">Notify the faculty advisor when a student's attendance drops below 75%.</p>
              </div>
              <button
                onClick={() => setAutoCounselorDispatch(!autoCounselorDispatch)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  autoCounselorDispatch ? "bg-[#22B573] text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700"
                }`}
              >
                {autoCounselorDispatch ? "Active" : "Off"}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-900/60 border border-[#E8EAF1] dark:border-slate-800">
              <div>
                <span className="font-bold text-[#171A2B] dark:text-white block">Student Privacy Protection</span>
                <p className="text-[11px] text-[#737A90]">Protect student personal information before analyzing performance trends.</p>
              </div>
              <button
                onClick={() => setStrictPrivacy(!strictPrivacy)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  strictPrivacy ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700"
                }`}
              >
                {strictPrivacy ? "Protected" : "Standard"}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-900/60 border border-[#E8EAF1] dark:border-slate-800">
              <div>
                <span className="font-bold text-[#171A2B] dark:text-white block">Online Exam Monitoring Sensitivity</span>
                <p className="text-[11px] text-[#737A90]">Warning limit for student eye gaze and noise during online exams.</p>
              </div>
              <select
                value={proctoringSensitivity}
                onChange={(e) => setProctoringSensitivity(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-[#E8EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs"
              >
                <option value="LOW">Standard (5 Warnings)</option>
                <option value="MEDIUM">Moderate (4 Warnings)</option>
                <option value="HIGH">Strict (3 Warnings)</option>
              </select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
