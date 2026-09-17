"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, CheckCircle, XCircle, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";

type ReportItem = {
  id: string;
  reporter: {
    id: string;
    name: string;
    handle: string;
  };
  targetType: "post" | "user" | "comment";
  targetId: string;
  reason: string;
  details: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  createdAt: string;
};

export default function ModerationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { firebaseUser, idToken, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/reports", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      router.push("/login");
      return;
    }
    fetchReports();
  }, [authLoading, firebaseUser, router, fetchReports]);

  const handleAction = async (reportId: string, action: "dismiss" | "resolve" | "remove_target") => {
    if (!idToken || actionInProgress) return;
    setActionInProgress(reportId);

    try {
      const res = await fetch("/api/v1/admin/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ reportId, action }),
      });

      if (!res.ok) throw new Error("Action failed");

      const newStatus = action === "dismiss" ? "dismissed" : action === "resolve" ? "reviewed" : "actioned";
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );

      toast({
        title: "অ্যাকশন সম্পন্ন হয়েছে",
        description: `রিপোর্টে '${action}' ব্যবস্থা নেওয়া হয়েছে।`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "ত্রুটি",
        description: "অ্যাকশন সম্পন্ন করা যায়নি।",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  const getStatusBadge = (status: ReportItem["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">বিচারাধীন (Pending)</Badge>;
      case "actioned":
        return <Badge variant="destructive">পদক্ষেপ গৃহীত (Actioned)</Badge>;
      case "reviewed":
        return <Badge variant="secondary" className="bg-green-500/10 text-green-600">পর্যালোচিত (Reviewed)</Badge>;
      case "dismissed":
        return <Badge variant="outline">খারিজ (Dismissed)</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">কন্টেন্ট মডারেশন ড্যাশবোর্ড</h1>
          </div>
        </div>
      </div>

      <div className="border-b border-border pb-2">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="all">সকল ({reports.length})</TabsTrigger>
            <TabsTrigger value="pending">
              বিচারাধীন ({reports.filter((r) => r.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="actioned">
              গৃহীত ({reports.filter((r) => r.status === "actioned").length})
            </TabsTrigger>
            <TabsTrigger value="dismissed">
              খারিজ ({reports.filter((r) => r.status === "dismissed").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredReports.length > 0 ? (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="shadow-sm">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-semibold capitalize">
                    {report.targetType} রিপোর্ট — {report.reason}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    রিপোর্টার: {report.reporter.name} (@{report.reporter.handle}) ·{" "}
                    {formatDistanceToNow(new Date(report.createdAt), {
                      addSuffix: true,
                      locale: bn,
                    })}
                  </CardDescription>
                </div>
                <div>{getStatusBadge(report.status)}</div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                {report.details && (
                  <p className="text-sm bg-muted/60 p-3 rounded-md text-foreground">
                    &quot;{report.details}&quot;
                  </p>
                )}

                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>টার্গেট আইডি: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">{report.targetId}</code></span>
                </div>

                {report.status === "pending" && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(report.id, "remove_target")}
                      disabled={actionInProgress === report.id}
                      className="flex items-center gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                      কন্টেন্ট মুছুন
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(report.id, "resolve")}
                      disabled={actionInProgress === report.id}
                      className="flex items-center gap-1.5"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      সমাধান চিহ্নিত করুন
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(report.id, "dismiss")}
                      disabled={actionInProgress === report.id}
                      className="flex items-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      খারিজ করুন
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center text-center p-16 text-muted-foreground">
            <ShieldAlert className="w-16 h-16 mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold">কোনো রিপোর্ট জমা নেই</h2>
            <p className="mt-2 text-sm">ব্যবহারকারীদের থেকে নতুন রিপোর্ট এলে এখানে দেখা যাবে।</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
