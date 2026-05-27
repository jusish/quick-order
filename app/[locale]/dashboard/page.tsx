"use client";

import * as React from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuthStore } from "@/stores/auth.store";
import { quickOrderService, QuickOrder, QuickOrderFilters } from "@/services/quick-order.service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ArrowRight,
  Send,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  TrendingUp,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  Clock,
} from "lucide-react";
import dayjs from "dayjs";
import Link from "next/link";

// Shadcn components
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function DashboardPage() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedStockId, user } = useAuthStore();

  // Filters state
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [status, setStatus] = React.useState<QuickOrderFilters["status"]>("");
  const [startDate, setStartDate] = React.useState(dayjs().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = React.useState(dayjs().format("YYYY-MM-DD"));

  // Selection state for bulk push
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset selection when stock or filters change
  React.useEffect(() => {
    setSelectedIds([]);
  }, [selectedStockId, status, debouncedSearch, startDate, endDate]);

  // Query quick orders
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["quickOrders", selectedStockId, status, debouncedSearch, startDate, endDate],
    queryFn: async () => {
      if (!selectedStockId) return { quickOrders: [], pagination: { total: 0 } };
      const res = await quickOrderService.getQuickOrders({
        stockId: selectedStockId,
        status,
        search: debouncedSearch,
        startDate,
        endDate,
        limit: 100,
      });
      return res.data;
    },
    enabled: !!selectedStockId,
  });

  const orders = data?.quickOrders || [];

  // Single push mutation
  const pushMutation = useMutation({
    mutationFn: async (id: string) => {
      return quickOrderService.pushToPurchaseOrder(id);
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("success.orderPushed"));
        queryClient.invalidateQueries({ queryKey: ["quickOrders"] });
      } else {
        toast.error(res.message || t("errors.generic"));
      }
    },
    onError: () => {
      toast.error(t("errors.network"));
    },
  });

  // Bulk push mutation
  const bulkPushMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return quickOrderService.bulkPush(ids);
    },
    onSuccess: (res) => {
      if (res.success) {
        const { successful, failed } = res.data;
        if (successful.length > 0) {
          toast.success(`Successfully pushed ${successful.length} orders to Dealuz!`);
        }
        if (failed.length > 0) {
          toast.error(`Failed to push ${failed.length} orders.`);
        }
        queryClient.invalidateQueries({ queryKey: ["quickOrders"] });
        setSelectedIds([]);
      } else {
        toast.error(t("errors.generic"));
      }
    },
    onError: () => {
      toast.error(t("errors.network"));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return quickOrderService.deleteQuickOrder(id);
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("success.orderDeleted"));
        queryClient.invalidateQueries({ queryKey: ["quickOrders"] });
      } else {
        toast.error(t("errors.generic"));
      }
    },
    onError: () => {
      toast.error(t("errors.network"));
    },
  });

  // Calculate metrics
  const metrics = React.useMemo(() => {
    let totalRevenue = 0;
    let totalTransport = 0;
    let orderCount = orders.length;

    orders.forEach((o) => {
      totalRevenue += Number(o.totalAmount);
      totalTransport += Number(o.transportTotal);
    });

    return { totalRevenue, totalTransport, orderCount };
  }, [orders]);

  const handleSelectOrder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const completedUnpushedOrders = orders.filter((o) => o.status === "COMPLETED" && !o.pushedAt);

  const handleSelectAllCompleted = () => {
    const completedIds = completedUnpushedOrders.map((o) => o.id);
    if (selectedIds.length === completedIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(completedIds);
    }
  };

  const handleBulkPush = () => {
    if (selectedIds.length === 0) return;
    toast.promise(bulkPushMutation.mutateAsync(selectedIds), {
      loading: t("dashboard.pushingOrders"),
    });
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const canPush = user?.role === "STOCK_OWNER" || user?.role === "STOCK_MANAGER";

  // Map status to Badge variant
  const statusBadge = (isPushed: boolean, isCompleted: boolean, isDraft: boolean) => {
    if (isPushed) return { variant: "outline" as const, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" };
    if (isCompleted) return { variant: "outline" as const, className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" };
    return { variant: "outline" as const, className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" };
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top metrics bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-300 rounded-md ring-0 border border-border py-0">
            <CardContent className="p-5 flex items-center justify-between px-5">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  {t("dashboard.todayOrders")}
                </span>
                <span className="text-2xl font-extrabold tracking-tight">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : metrics.orderCount}
                </span>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center text-primary">
                <Layers className="w-5 h-5 stroke-[2]" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300 rounded-md ring-0 border border-border py-0">
            <CardContent className="p-5 flex items-center justify-between px-5">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  {t("dashboard.totalRevenue")}
                </span>
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    `${metrics.totalRevenue.toLocaleString()} ${t("common.rwf")}`
                  )}
                </span>
              </div>
              <div className="w-10 h-10 bg-emerald-500/10 rounded-md flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-5 h-5 stroke-[2]" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300 rounded-md ring-0 border border-border py-0">
            <CardContent className="p-5 flex items-center justify-between px-5">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  {t("dashboard.totalTransport")}
                </span>
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    `${metrics.totalTransport.toLocaleString()} ${t("common.rwf")}`
                  )}
                </span>
              </div>
              <div className="w-10 h-10 bg-blue-500/10 rounded-md flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Truck className="w-5 h-5 stroke-[2]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and CTA */}
        <Card className="rounded-md ring-0 border border-border py-0">
          <CardContent className="p-5 space-y-4 px-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <span>{t("dashboard.title")}</span>
                <Badge variant="outline" className="text-xs font-bold">
                  {orders.length}
                </Badge>
              </h2>

              <Link
                href="/orders/new"
                className={buttonVariants({
                  size: "sm",
                  variant: "default",
                }) + " w-full sm:w-auto flex items-center gap-1.5"}
              >
                <Plus className="w-4 h-4" />
                <span>{t("dashboard.newOrderBtn")}</span>
              </Link>
            </div>

            {/* Filtering row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
              {/* Search */}
              <div className="md:col-span-6 lg:col-span-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("dashboard.searchPlaceholder")}
                  className="pl-9 h-9"
                />
              </div>

              {/* Date picking */}
              <div className="md:col-span-6 lg:col-span-5 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9 h-9 font-bold cursor-pointer"
                  />
                </div>
                <span className="text-muted-foreground text-xs font-bold text-center self-center sm:self-auto">to</span>
                <div className="relative flex-1 w-full">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-9 h-9 font-bold cursor-pointer"
                  />
                </div>
              </div>

              {/* Status Selector tabs */}
              <div className="md:col-span-12 lg:col-span-3">
                <Tabs value={status || "_all"} onValueChange={(v) => setStatus(v === "_all" ? "" : v as any)}>
                  <TabsList className="w-full h-9">
                    <TabsTrigger value="_all" className="flex-1 text-xs">{t("dashboard.filterAll")}</TabsTrigger>
                    <TabsTrigger value="DRAFT" className="flex-1 text-xs">{t("dashboard.filterDraft")}</TabsTrigger>
                    <TabsTrigger value="COMPLETED" className="flex-1 text-xs">{t("dashboard.filterCompleted")}</TabsTrigger>
                    <TabsTrigger value="PUSHED" className="flex-1 text-xs">{t("dashboard.filterPushed")}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk select PO options */}
        {(status === "" || status === "COMPLETED") && completedUnpushedOrders.length > 0 && canPush && (
          <Card className="rounded-md ring-0 border border-primary/20 bg-primary/5 py-0 animate-fade-in">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.length > 0 && selectedIds.length === completedUnpushedOrders.length}
                  onCheckedChange={handleSelectAllCompleted}
                />
                <span className="text-sm font-bold text-foreground">
                  {selectedIds.length > 0
                    ? `Selected ${selectedIds.length} order(s) to push`
                    : `Select all completed orders to push`}
                </span>
              </div>
              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleBulkPush}
                  disabled={bulkPushMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {bulkPushMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{t("dashboard.pushSelected")}</span>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading / Error / Empty / Orders list */}
        {isLoading ? (
          <Card className="rounded-md ring-0 border border-border py-0">
            <CardContent className="h-64 flex flex-col items-center justify-center gap-3 px-5">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-bold">{t("common.loading")}</span>
            </CardContent>
          </Card>
        ) : isError ? (
          <Card className="rounded-md ring-0 border border-border py-0">
            <CardContent className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 px-5">
              <AlertCircle className="w-10 h-10 text-destructive mb-1 stroke-[1.5]" />
              <h3 className="font-extrabold text-foreground text-sm">{t("errors.generic")}</h3>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t("common.retry")}
              </Button>
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card className="rounded-md ring-0 border border-border py-0">
            <CardContent className="h-64 flex flex-col items-center justify-center text-center p-8 px-5">
              <Sparkles className="w-10 h-10 text-primary mb-2 stroke-[1.5] animate-pulse" />
              <h3 className="font-extrabold text-base mb-1">{t("dashboard.emptyTitle")}</h3>
              <p className="text-muted-foreground text-xs font-bold max-w-xs">
                {t("dashboard.emptyDesc")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => {
              const itemsCount = order.items?.length || 0;
              const formattedDate = dayjs(order.createdAt).format("hh:mm A");
              const isPushed = !!order.pushedAt;
              const isCompleted = order.status === "COMPLETED" && !isPushed;
              const isDraft = order.status === "DRAFT";
              const { variant: badgeVariant, className: badgeClassName } = statusBadge(isPushed, isCompleted, isDraft);

              return (
                <Card
                  key={order.id}
                  className={`rounded-md ring-0 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden py-0 hover:shadow-md ${
                    selectedIds.includes(order.id)
                      ? "border-primary ring-1 ring-primary/25"
                      : "border-border hover:border-primary/25"
                  }`}
                >
                  {/* Decorative bg glow */}
                  {isPushed && (
                    <div className="absolute top-0 right-0 w-[120px] h-[120px] rounded-full bg-emerald-500/5 blur-[25px] pointer-events-none" />
                  )}
                  {isDraft && (
                    <div className="absolute top-0 right-0 w-[120px] h-[120px] rounded-full bg-amber-500/5 blur-[25px] pointer-events-none" />
                  )}

                  <CardContent className="p-5 space-y-3 px-5">
                    {/* Title and Badge row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {isCompleted && canPush && (
                          <Checkbox
                            checked={selectedIds.includes(order.id)}
                            onCheckedChange={() => handleSelectOrder(order.id)}
                          />
                        )}
                        <div>
                          <h3 className="font-bold text-base leading-tight text-foreground">
                            {order.title}
                          </h3>
                          <span className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formattedDate} • {t("dashboard.itemCount", { count: itemsCount })}
                          </span>
                        </div>
                      </div>

                      <Badge variant={badgeVariant} className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${badgeClassName}`}>
                        {t(`order.status.${isPushed ? "PUSHED" : order.status}`)}
                      </Badge>
                    </div>

                    {/* Summary items preview */}
                    <div className="bg-muted rounded-md p-3.5 border border-border space-y-1.5">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex justify-between text-xs font-bold">
                          <span className="text-muted-foreground truncate max-w-[200px]">
                            {item.product.name}
                          </span>
                          <span className="text-foreground">
                            {item.quantity} {item.uom.symbol}
                          </span>
                        </div>
                      ))}
                      {itemsCount > 3 && (
                        <div className="text-[10px] font-bold text-primary pl-1.5">
                          + {itemsCount - 3} more items...
                        </div>
                      )}
                    </div>
                  </CardContent>

                  {/* Actions & Totals Footer */}
                  <CardContent className="border-t border-border pt-3 pb-4 px-5 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold text-muted-foreground leading-none">
                        {t("order.subtotal")}: {Number(order.subtotal).toLocaleString()} {t("common.rwf")}
                      </span>
                      {Number(order.transportTotal) > 0 && (
                        <span className="text-[9px] font-bold text-blue-500 leading-none">
                          {t("order.transportTotal")}: +{Number(order.transportTotal).toLocaleString()} {t("common.rwf")}
                        </span>
                      )}
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block leading-none mt-1">
                        {t("order.grandTotal")}
                      </span>
                      <span className="font-extrabold text-sm sm:text-base leading-none tracking-tight">
                        {Number(order.totalAmount).toLocaleString()} {t("common.rwf")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPushed ? (
                        <Link
                          href={`/orders/${order.id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          }) + " flex items-center gap-1"}
                        >
                          <span>{t("common.back")}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(order.id, order.title)}
                            disabled={deleteMutation.isPending}
                            title={t("order.deleteOrder")}
                            className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>

                          <Link
                            href={`/orders/${order.id}`}
                            title={t("common.edit")}
                            className={buttonVariants({
                              variant: "outline",
                              size: "icon",
                            }) + " text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/20"}
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </Link>

                          {isCompleted && canPush && (
                            <Button
                              size="sm"
                              onClick={() => pushMutation.mutate(order.id)}
                              disabled={pushMutation.isPending}
                              className="flex items-center gap-1"
                            >
                              {pushMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              <span>Push</span>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <DialogTitle className="text-sm font-extrabold uppercase tracking-wider text-destructive">
                Delete Order
              </DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to delete this order? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="bg-muted border border-border rounded-md px-3.5 py-3 text-xs font-extrabold text-foreground truncate">
              {deleteTarget.name}
            </div>
          )}

          <DialogFooter className="flex-row justify-end gap-2 border-t-0 bg-transparent p-0 -mx-0 -mb-0 rounded-none">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Delete</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
