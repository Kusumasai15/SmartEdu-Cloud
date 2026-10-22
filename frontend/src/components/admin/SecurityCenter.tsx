"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  UserX,
  Clock,
  AlertTriangle,
  Radio,
  Lock,
  Globe,
  Ban,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SecuritySession {
  id: string;
  userName: string;
  userEmail: string;
  role: string;
  ipAddress: string;
  device: string;
  issuedAt: string;
  expiresAt: string;
}

interface ThreatIncident {
  id: string;
  type: "EXAM_WARNING" | "MULTIPLE_LOGIN_ATTEMPTS" | "LOCATION_MISMATCH" | "SUSPICIOUS_ACTIVITY";
  description: string;
  sourceIp: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: string;
  status: "RESOLVED" | "FLAGGED";
}

const initialSessions: SecuritySession[] = [];

const initialThreats: ThreatIncident[] = [];

const initialBannedIps: string[] = [];

export function SecurityCenter() {
  const [sessions, setSessions] = useState<SecuritySession[]>(initialSessions);
  const [threats, setThreats] = useState<ThreatIncident[]>(initialThreats);
  const [bannedIps, setBannedIps] = useState<string[]>(initialBannedIps);
  const [newBanIp, setNewBanIp] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRevokeSession = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    showToast(`✓ Device session for ${target?.userEmail} logged out successfully.`);
  };

  const handleRevokeAll = () => {
    setSessions([]);
    showToast("✓ All devices logged out. Users must log in again with their password.");
  };

  const handleResolveThreat = (id: string) => {
    setThreats((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "RESOLVED" } : t))
    );
    showToast("✓ Security incident marked as reviewed and resolved.");
  };

  const handleAddBannedIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanIp.trim()) return;
    setBannedIps([newBanIp.trim(), ...bannedIps]);
    showToast(`✓ IP Address ${newBanIp.trim()} added to blocked access list.`);
    setNewBanIp("");
  };

  const handleRemoveBannedIp = (ip: string) => {
    setBannedIps((prev) => prev.filter((item) => item !== ip));
    showToast(`✓ IP Address ${ip} unblocked.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {notification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#22B573]" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-[#737A90] tracking-wider">Active Logins</span>
          <p className="text-2xl font-black text-[#22B573] font-mono">{sessions.length} Online</p>
          <span className="text-xs text-[#22B573] font-bold">Secure University Access</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-[#737A90] tracking-wider">Security Flags</span>
          <p className="text-2xl font-black text-amber-500 font-mono">
            {threats.filter((t) => t.status === "FLAGGED").length} Pending
          </p>
          <span className="text-xs text-amber-500 font-bold">Exam &amp; Login Notices</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-[#737A90] tracking-wider">Blocked Addresses</span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{bannedIps.length} Blocked</p>
          <span className="text-xs text-[#737A90]">Security Filter Active</span>
        </div>

        <div className="bg-white dark:bg-[#181C2B] rounded-[20px] p-5 border border-[#E8EAF1] dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-[#737A90] tracking-wider">Data Protection</span>
          <p className="text-2xl font-black text-[#171A2B] dark:text-white font-mono">Encrypted</p>
          <span className="text-xs text-[#22B573] font-bold">Industry Standard Privacy</span>
        </div>
      </div>

      {/* Active User Sessions & Revocation */}
      <Card className="border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B]">
        <CardHeader className="p-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
              <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
              <span>Active User Logins &amp; Device Management</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#737A90]">
              Review active accounts currently signed into the university platform with instant logout controls.
            </CardDescription>
          </div>

          {sessions.length > 0 && (
            <Button
              onClick={handleRevokeAll}
              variant="outline"
              className="text-xs font-bold text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 cursor-pointer"
            >
              Log Out All Devices
            </Button>
          )}
        </CardHeader>

        <div className="overflow-x-auto border-t border-[#E8EAF1] dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F8FC] dark:bg-slate-800/60 text-[#737A90] uppercase text-[10px]">
              <tr>
                <th className="p-3.5">User Identity</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Device Type</th>
                <th className="p-3.5">Login Time</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAF1] dark:border-slate-800">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#737A90]">
                    No active sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F7F8FC] dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <strong className="text-[#171A2B] dark:text-white block">{s.userName}</strong>
                      <span className="font-mono text-[11px] text-[#737A90]">{s.userEmail}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                        {s.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#737A90]">{s.device}</td>
                    <td className="p-3.5 text-[#737A90]">{s.issuedAt}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 text-[11px] font-bold hover:bg-rose-50 cursor-pointer"
                      >
                        Log Out Device
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Security Incidents & Threat Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Incident Stream */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B]">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <span>Security Alerts &amp; Examination Warnings</span>
              </CardTitle>
            </CardHeader>
            <div className="p-5 pt-0 space-y-3">
              {threats.length === 0 ? (
                <div className="p-6 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-900/60 text-center text-xs text-[#737A90]">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
                  <p className="font-semibold text-[#171A2B] dark:text-white">All Clear — No Threat Incidents</p>
                  <p className="text-[11px] text-[#737A90] mt-0.5">Automated intrusion & exam proctoring logs will stream here.</p>
                </div>
              ) : (
                threats.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-900/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950">
                          {t.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-[#737A90]">{t.timestamp}</span>
                      </div>
                      <p className="font-medium text-[#171A2B] dark:text-white leading-relaxed">{t.description}</p>
                    </div>

                    {t.status === "FLAGGED" ? (
                      <Button
                        onClick={() => handleResolveThreat(t.id)}
                        className="btn-saas-outline text-xs px-3 py-1 font-bold text-slate-900 dark:text-slate-100 shrink-0"
                      >
                        Mark Reviewed
                      </Button>
                    ) : (
                      <span className="text-[#22B573] font-bold text-[11px] inline-flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Reviewed</span>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right 1 col: Blocked IP Management */}
        <div className="space-y-4">
          <Card className="border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B]">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
                <Ban className="h-4 w-4 text-rose-600" />
                <span>Blocked IP Addresses</span>
              </CardTitle>
            </CardHeader>

            <div className="p-5 pt-0 space-y-4 text-xs">
              <form onSubmit={handleAddBannedIp} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newBanIp}
                  onChange={(e) => setNewBanIp(e.target.value)}
                  placeholder="Enter IP address..."
                  className="flex-1 p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono"
                />
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3">
                  Block
                </Button>
              </form>

              <div className="space-y-2">
                {bannedIps.map((ip) => (
                  <div
                    key={ip}
                    className="p-2.5 rounded-xl bg-[#F7F8FC] dark:bg-slate-900/60 border border-[#E8EAF1] dark:border-slate-800 flex items-center justify-between font-mono"
                  >
                    <span className="text-[#171A2B] dark:text-white font-bold">{ip}</span>
                    <button
                      onClick={() => handleRemoveBannedIp(ip)}
                      className="text-rose-600 hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
