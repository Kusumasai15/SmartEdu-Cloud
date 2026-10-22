"use client";

import React, { useState, useMemo } from "react";
import {
  History,
  Search,
  Filter,
  Download,
  ShieldCheck,
  CheckCircle2,
  X,
  Eye,
  FileText,
  Clock,
  User,
  Hash,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface AuditRecord {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  category: "ACADEMIC" | "POLICY" | "SECURITY";
  targetResource: string;
  referenceCode: string;
  details: string;
}

const initialAuditLogs: AuditRecord[] = [];

export function AuditExplorer() {
  const [logs, setLogs] = useState<AuditRecord[]>(initialAuditLogs);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const filtered = useMemo(() => {
    return logs.filter((item) => {
      const matchesSearch =
        item.actorName.toLowerCase().includes(search.toLowerCase()) ||
        item.action.toLowerCase().includes(search.toLowerCase()) ||
        item.targetResource.toLowerCase().includes(search.toLowerCase()) ||
        item.referenceCode.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = categoryFilter === "ALL" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [logs, search, categoryFilter]);

  const handleExportAudit = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `smartedu-activity-log-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("✓ Official university activity log exported (.json) successfully.");
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

      {/* Header */}
      <Card className="border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B]">
        <CardHeader className="p-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[#171A2B] dark:text-white">
              <History className="h-5 w-5 text-[#22B573]" />
              <span>Official Activity Log &amp; University Records History</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#737A90]">
              Verified chronological record of grade entries, administrative approvals, and institutional decisions.
            </CardDescription>
          </div>

          <Button
            onClick={handleExportAudit}
            className="btn-saas-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export Official Log</span>
          </Button>
        </CardHeader>

        {/* Search & Category Filter */}
        <div className="px-5 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737A90]" />
            <Input
              placeholder="Search by user, action, subject, or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9 rounded-xl border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            {["ALL", "ACADEMIC", "POLICY", "SECURITY"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-[#22B573] text-white shadow-xs"
                    : "bg-[#F7F8FC] dark:bg-slate-800 text-[#737A90] hover:text-[#171A2B]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto border-t border-[#E8EAF1] dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F8FC] dark:bg-slate-800/60 text-[#737A90] uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Date &amp; Time</th>
                <th className="p-3.5">User &amp; Role</th>
                <th className="p-3.5">Activity Event</th>
                <th className="p-3.5">Subject / Department</th>
                <th className="p-3.5">Reference Code</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAF1] dark:border-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#737A90]">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-[#737A90]" />
                    <p className="font-semibold text-[#171A2B] dark:text-white">No audit records found</p>
                    <p className="text-[11px] text-[#737A90] mt-0.5">Campus governance, grade authorization, and security logs will appear here.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F7F8FC] dark:hover:bg-slate-800/40">
                    <td className="p-3.5 text-[11px] text-[#737A90] whitespace-nowrap">{r.timestamp}</td>
                    <td className="p-3.5">
                      <strong className="text-[#171A2B] dark:text-white block">{r.actorName}</strong>
                      <span className="text-[10px] text-slate-900 dark:text-slate-100 font-bold">{r.actorRole}</span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                          r.category === "SECURITY"
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950"
                            : r.category === "POLICY"
                            ? "bg-purple-50 text-purple-600 dark:bg-purple-950"
                            : "bg-blue-50 text-slate-900 dark:text-slate-100 dark:bg-slate-800"
                        }`}
                      >
                        {r.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-[#171A2B] dark:text-white max-w-xs truncate">{r.targetResource}</td>
                    <td className="p-3.5 font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100">{r.referenceCode}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="p-1.5 rounded-lg border border-[#E8EAF1] dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#22B573]" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">Activity Record Details</h3>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-[#737A90] hover:text-[#171A2B]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-800 space-y-1">
                <span className="text-[#737A90]">Action</span>
                <p className="font-bold text-[#171A2B] dark:text-white text-sm">{selectedRecord.action.replace(/_/g, " ")}</p>
                <p className="text-[#737A90]">{selectedRecord.details}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-800 space-y-0.5">
                  <span className="text-[#737A90]">Performed By</span>
                  <p className="font-bold text-[#171A2B] dark:text-white">{selectedRecord.actorName} ({selectedRecord.actorRole})</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-800 space-y-0.5">
                  <span className="text-[#737A90]">Reference Code</span>
                  <p className="font-bold font-mono text-slate-900 dark:text-slate-100">{selectedRecord.referenceCode}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
              <Button onClick={() => setSelectedRecord(null)} className="btn-saas-primary text-xs px-4 font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
