"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Award,
  Calendar,
  AlertCircle,
  Building2,
} from "lucide-react";
import { GovernanceSummary, GovernanceRequestItem } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/smartedu/EmptyState";
import { TableSkeleton } from "@/components/smartedu/LoadingSkeleton";
import { formatDate } from "@/lib/utils";

export const GovernanceView: React.FC = () => {
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [requests, setRequests] = useState<GovernanceRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumResp, reqResp] = await Promise.all([
        fetchApi<GovernanceSummary>("/admin/governance/summary"),
        fetchApi<GovernanceRequestItem[]>("/admin/governance/requests"),
      ]);
      if (sumResp.success && sumResp.data) {
        setSummary(sumResp.data);
      }
      if (reqResp.success && reqResp.data) {
        setRequests(reqResp.data);
      }
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/40 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Pending Result Approvals</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {summary?.pending_result_approvals ?? 0}
          </div>
        </Card>

        <Card className="border-border/60 bg-card/40 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Pending Grade Corrections</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {summary?.pending_result_corrections ?? 0}
          </div>
        </Card>

        <Card className="border-border/60 bg-card/40 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Pending Student Leaves</span>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {summary?.pending_leave_requests ?? 0}
          </div>
        </Card>

        <Card className="border-border/60 bg-card/40 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Actionable Queue</span>
            <FileCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {summary?.total_actionable_requests ?? 0}
          </div>
        </Card>
      </div>

      {/* Requests Table */}
      <Card className="border-border/60 bg-card/40 backdrop-blur-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" />
            Cross-Departmental Governance &amp; Approval Requests
          </CardTitle>
          <CardDescription className="text-xs">
            Aggregated audit view of pending academic submissions, corrections, and exception workflows.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={4} />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Governance queues clear"
              description="There are currently no outstanding academic approvals awaiting review."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/20">
                    <TableHead className="text-xs font-bold">Request Type</TableHead>
                    <TableHead className="text-xs font-bold">Requester</TableHead>
                    <TableHead className="text-xs font-bold">Department</TableHead>
                    <TableHead className="text-xs font-bold">Details</TableHead>
                    <TableHead className="text-xs font-bold">Submitted</TableHead>
                    <TableHead className="text-xs font-bold text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id} className="border-border/40 hover:bg-muted/10">
                      <TableCell className="font-semibold text-xs text-foreground">
                        {r.request_type}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-foreground font-medium">{r.requester_name}</div>
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {r.requester_role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.department_name || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {r.details}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(r.submitted_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
