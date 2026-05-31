"use client";

import * as React from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuthStore } from "@/stores/auth.store";
import { quickOrderService, QuickOrder, UpdateQuickOrderDto, QuickOrderItemDto } from "@/services/quick-order.service";
import { productService, Product } from "@/services/product.service";
import { customerService, Customer } from "@/services/customer.service";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  FileCheck,
  CheckCircle,
  Truck,
  ArrowLeft,
  X,
  Calendar,
  User as UserIcon,
  ExternalLink,
  Sparkles,
  Pencil,
  Printer,
  Download,
} from "lucide-react";
import dayjs from "dayjs";
import Link from "next/link";
import api from "@/lib/api";

// Shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ItemTemp extends QuickOrderItemDto {
  id: string;
  productName: string;
  stockId: string;
  uomSymbol: string;
  lineTotal: number;
}

export default function OrderDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { selectedStockId, user } = useAuthStore();
  const orderId = params.id as string;
  const dealuzClientUrl = process.env.NEXT_PUBLIC_DEALUZ_CLIENT_URL || "http://localhost:3000";

  // Form states
  const [customerName, setCustomerName] = React.useState("");
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = React.useState(false);
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [isCustomersLoading, setIsCustomersLoading] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<ItemTemp[]>([]);

  // Product form states
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = React.useState(false);
  const [productSearch, setProductSearch] = React.useState("");
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [productDropdownOpen, setProductDropdownOpen] = React.useState(false);

  const [quantity, setQuantity] = React.useState<number | "">("");
  const [unitPrice, setUnitPrice] = React.useState<number | "">("");
  const [hasTransport, setHasTransport] = React.useState(false);
  const [transportPrice, setTransportPrice] = React.useState<number | "">("");

  const [availableStock, setAvailableStock] = React.useState<number | null>(null);
  const [isCheckingStock, setIsCheckingStock] = React.useState(false);
  const [lastTransportPrice, setLastTransportPrice] = React.useState<number>(0);

  const [uoms, setUoms] = React.useState<any[]>([]);
  const [selectedUomId, setSelectedUomId] = React.useState<string>("");

  const [activeTab, setActiveTab] = React.useState<"intake" | "pad">("intake");

  // Fetch order
  const { data: orderResponse, isLoading: isOrderLoading, isError } = useQuery({
    queryKey: ["quickOrder", orderId],
    queryFn: async () => quickOrderService.getQuickOrderById(orderId),
    enabled: !!orderId,
  });

  const order = orderResponse?.data;
  const isPushed = !!order?.pushedAt;
  const isCompleted = order?.status === "COMPLETED" && !isPushed;

  // Pre-populate on load
  React.useEffect(() => {
    if (order) {
      setCustomerName(order.title);
      let displayNotes = order.notes || "";
      if (order.notes && order.notes.startsWith("[CustomerId: ")) {
        const match = order.notes.match(/^\[CustomerId:\s*([^\]\s]+)\]\s*([\s\S]*)/);
        if (match) {
          setSelectedCustomerId(match[1]);
          displayNotes = match[2] || "";
        }
      } else {
        setSelectedCustomerId(null);
      }
      setNotes(displayNotes);
      const loadedItems = order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        stockId: item.product.stockId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        transportPrice: Number(item.transportPrice),
        uomId: item.uomId,
        uomSymbol: item.uom.symbol,
        lineTotal: Number(item.quantity) * Number(item.unitPrice) + Number(item.quantity) * Number(item.transportPrice),
      }));
      setItems(loadedItems);
    }
  }, [order]);

  // Load UoMs
  React.useEffect(() => {
    if (!selectedStockId || isPushed) return;
    const loadUoms = async () => {
      try {
        const url = selectedStockId === "all"
          ? `/unit-of-measure/stock`
          : `/unit-of-measure/stock/${selectedStockId}`;
        const res = await api.get(url);
        if (res.data?.success && res.data?.data) setUoms(res.data.data);
      } catch (err) {
        console.error("Failed to load UoMs", err);
      }
    };
    loadUoms();
  }, [selectedStockId, isPushed]);

  // Load customers with debounced server-side search
  React.useEffect(() => {
    if (isPushed) return;
    const loadCustomers = async () => {
      setIsCustomersLoading(true);
      try {
        const list = await customerService.getCustomers(customerSearch);
        setCustomers(list);
      } catch (e) {
        // ignore
      } finally {
        setIsCustomersLoading(false);
      }
    };
    const handler = setTimeout(() => { loadCustomers(); }, 300);
    return () => clearTimeout(handler);
  }, [isPushed, customerSearch]);

  const filteredCustomers = React.useMemo(() => customers.slice(0, 5), [customers]);

  // Load products with debounced server-side search
  React.useEffect(() => {
    if (!selectedStockId || isPushed) return;
    const loadProducts = async () => {
      setIsProductsLoading(true);
      try {
        const list = await productService.getProductsByStock(selectedStockId, productSearch);
        setProducts(list);
      } catch (err) {
        // ignore
      } finally {
        setIsProductsLoading(false);
      }
    };
    const handler = setTimeout(() => { loadProducts(); }, 300);
    return () => clearTimeout(handler);
  }, [selectedStockId, isPushed, productSearch]);

  // filteredProducts: server already filtered, just slice for display
  const filteredProducts = React.useMemo(() => products.slice(0, 100), [products]);

  // Check stock and last transport price
  React.useEffect(() => {
    if (!selectedProduct || !selectedStockId || isPushed) {
      setAvailableStock(null);
      setLastTransportPrice(0);
      return;
    }
    const checkDetails = async () => {
      setIsCheckingStock(true);
      try {
        const stockId = selectedStockId === "all" ? selectedProduct.stockId : selectedStockId;
        const stockRes = await quickOrderService.getStockAvailability(selectedProduct.id, stockId);
        if (stockRes.success) setAvailableStock(stockRes.data.available);
        const priceRes = await quickOrderService.getTransportPrice(selectedProduct.id, stockId);
        if (priceRes.success && priceRes.data.price !== undefined) {
          setLastTransportPrice(Number(priceRes.data.price));
          if (hasTransport) setTransportPrice(Number(priceRes.data.price));
        }
      } catch (err) {
        // ignore
      } finally {
        setIsCheckingStock(false);
      }
    };
    checkDetails();
  }, [selectedProduct, selectedStockId, hasTransport, isPushed]);

  // Pre-fill price/UoM
  React.useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(Number(selectedProduct.sellingPrice) || 0);
      setSelectedUomId(selectedProduct.uomId);
    } else {
      setUnitPrice("");
      setSelectedUomId("");
    }
  }, [selectedProduct]);

  const handleTransportToggle = (checked: boolean) => {
    setHasTransport(checked);
    if (checked) {
      setTransportPrice(lastTransportPrice || 0);
    } else {
      setTransportPrice("");
    }
  };

  const selectedProductUom = React.useMemo(() => {
    if (!selectedProduct || uoms.length === 0) return null;
    return uoms.find((u) => u.id === selectedProduct.uomId);
  }, [selectedProduct, uoms]);

  const compatibleUoms = React.useMemo(() => {
    if (!selectedProductUom) return [];
    return uoms.filter((u) => u.category === selectedProductUom.category && u.status === "ENABLED");
  }, [selectedProductUom, uoms]);

  const handleAddItem = () => {
    if (!selectedProduct) return;
    if (!quantity || Number(quantity) <= 0) return;
    if (unitPrice === "" || Number(unitPrice) < 0) return;

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const trans = hasTransport ? Number(transportPrice || 0) : 0;
    const itemTotal = qty * price + qty * trans;
    const selectedUom = uoms.find((u) => u.id === selectedUomId) || selectedProduct.uom;

    const newItem: ItemTemp = {
      id: Math.random().toString(36).substring(7),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      stockId: selectedProduct.stockId,
      quantity: qty,
      unitPrice: price,
      transportPrice: trans,
      uomId: selectedUomId || selectedProduct.uomId,
      uomSymbol: selectedUom?.symbol || selectedProduct.uom?.symbol || t("order.uom"),
      lineTotal: itemTotal,
    };

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === selectedProduct.id && item.uomId === (selectedUomId || selectedProduct.uomId)
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const newQty = existing.quantity + qty;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          unitPrice: price,
          transportPrice: trans,
          lineTotal: newQty * price + newQty * trans,
        };
        toast.success("Merged item into existing order row");
        return updated;
      } else {
        toast.success("Item added to order pad");
        return [...prev, newItem];
      }
    });

    setSelectedProduct(null);
    setProductSearch("");
    setQuantity("");
    setUnitPrice("");
    setHasTransport(false);
    setTransportPrice("");
    setAvailableStock(null);
    setLastTransportPrice(0);
  };

  const handleEditItem = (item: ItemTemp) => {
    const prod = products.find((p) => p.id === item.productId);
    if (prod) {
      setSelectedProduct(prod);
      setQuantity(item.quantity);
      setUnitPrice(item.unitPrice);
      setHasTransport(item.transportPrice > 0);
      setTransportPrice(item.transportPrice > 0 ? item.transportPrice : "");
      setSelectedUomId(item.uomId);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setActiveTab("intake");
      toast.info("Item loaded into form for editing");
    } else {
      toast.error("Could not load product details");
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totals = React.useMemo(() => {
    let subtotal = 0;
    let transportTotal = 0;
    items.forEach((item) => {
      subtotal += item.quantity * item.unitPrice;
      transportTotal += item.quantity * item.transportPrice;
    });
    return { subtotal, transportTotal, totalAmount: subtotal + transportTotal };
  }, [items]);

  // Save changes mutation
  const saveChangesMutation = useMutation({
    mutationFn: async (status: "DRAFT" | "COMPLETED") => {
      const notesString = selectedCustomerId
        ? `[CustomerId: ${selectedCustomerId}]${notes.trim()}`
        : notes.trim();

      const orderPayload: UpdateQuickOrderDto = {
        title: customerName.trim() || "Walk-In Customer",
        status,
        notes: notesString || undefined,
        subtotal: totals.subtotal,
        transportTotal: totals.transportTotal,
        totalAmount: totals.totalAmount,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          transportPrice: i.transportPrice,
          uomId: i.uomId,
        })),
      };
      return quickOrderService.updateQuickOrder(orderId, orderPayload);
    },
    onSuccess: (res, status) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["quickOrder", orderId] });
        queryClient.invalidateQueries({ queryKey: ["quickOrders"] });
        if (status === "DRAFT") {
          toast.success(t("success.draftSaved"));
        } else {
          toast.success(t("success.orderCompleted"));
          router.push("/dashboard");
        }
      } else {
        toast.error(res.message || t("errors.generic"));
      }
    },
    onError: () => {
      toast.error(t("errors.network"));
    },
  });

  // Push mutation
  const pushMutation = useMutation({
    mutationFn: async () => quickOrderService.pushToPurchaseOrder(orderId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("success.orderPushed"));
        queryClient.invalidateQueries({ queryKey: ["quickOrder", orderId] });
        queryClient.invalidateQueries({ queryKey: ["quickOrders"] });
      } else {
        toast.error(res.message || t("errors.generic"));
      }
    },
    onError: () => {
      toast.error(t("errors.network"));
    },
  });

  const handlePush = () => {
    toast.promise(pushMutation.mutateAsync(), { loading: t("order.pushing") });
  };

  const handleUpdate = (status: "DRAFT" | "COMPLETED") => {
    if (items.length === 0) { toast.warning(t("order.noItems")); return; }
    saveChangesMutation.mutate(status);
  };

  const canPush = user?.role === "STOCK_OWNER" || user?.role === "STOCK_MANAGER";

  // Print/Download handler
  const handlePrintOrder = (download = false) => {
    if (!order) return;

    const formattedDate = dayjs(order.createdAt).format("YYYY-MM-DD hh:mm A");
    const docTitle = `Quick Order Receipt - ${order.title}`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to print.");
      return;
    }

    const itemsHtml = items.map((item) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px 4px; text-align: left; font-weight: 500;">${item.productName}</td>
        <td style="padding: 6px 4px; text-align: center;">${item.quantity} ${item.uomSymbol}</td>
        <td style="padding: 6px 4px; text-align: right; font-weight: bold;">${item.lineTotal.toLocaleString()} RWF</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              line-height: 1.4;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 15px;
            }
            .brand {
              font-size: 20px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #0f172a;
            }
            .title-info {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 8px;
            }
            .customer { font-size: 13px; font-weight: 700; }
            .date { font-size: 11px; color: #64748b; font-weight: 500; }
            .order-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .order-table th {
              background-color: #f8fafc;
              border-bottom: 2px solid #cbd5e1;
              color: #475569;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 6px 4px;
              letter-spacing: 0.5px;
            }
            .totals-container {
              display: flex;
              justify-content: flex-end;
              margin-top: 15px;
              border-top: 2px solid #cbd5e1;
              padding-top: 10px;
            }
            .totals-table { width: 250px; font-size: 12px; border-collapse: collapse; }
            .totals-table td { padding: 4px 0; }
            .totals-table tr.grand-total {
              font-size: 14px;
              font-weight: 900;
              border-top: 1px solid #0f172a;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">DEALUZ POS</div>
            <div class="title-info">
              <div class="customer">Customer: ${order.title}</div>
              <div class="date">Date: ${formattedDate}</div>
            </div>
          </div>
          <table class="order-table">
            <thead>
              <tr>
                <th style="text-align: left; width: 60%;">Product Name</th>
                <th style="text-align: center; width: 20%;">Qty</th>
                <th style="text-align: right; width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals-container">
            <table class="totals-table">
              <tr>
                <td style="color: #64748b;">Subtotal:</td>
                <td style="text-align: right; font-weight: bold;">${totals.subtotal.toLocaleString()} RWF</td>
              </tr>
              ${totals.transportTotal > 0 ? `
              <tr>
                <td style="color: #64748b;">Transport Total:</td>
                <td style="text-align: right; font-weight: bold; color: #3b82f6;">+${totals.transportTotal.toLocaleString()} RWF</td>
              </tr>
              ` : ""}
              <tr class="grand-total">
                <td style="padding-top: 8px;">Grand Total:</td>
                <td style="text-align: right; padding-top: 8px; color: #0f172a;">${totals.totalAmount.toLocaleString()} RWF</td>
              </tr>
            </table>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Status badge helper
  const getStatusBadgeClass = () => {
    if (isPushed) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    if (isCompleted) return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  };

  // Loading state
  if (isOrderLoading) {
    return (
      <AppLayout>
        <Card className="rounded-md ring-0 border border-border py-0">
          <CardContent className="h-96 flex flex-col items-center justify-center gap-3 px-5">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-bold">{t("common.loading")}</span>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (isError || !order) {
    return (
      <AppLayout>
        <Card className="rounded-md ring-0 border border-border py-0">
          <CardContent className="h-96 flex flex-col items-center justify-center gap-3 text-center p-6 px-5">
            <AlertTriangle className="w-10 h-10 text-destructive mb-1 stroke-[1.5]" />
            <h2 className="text-base font-bold text-foreground">{t("errors.notFound")}</h2>
            <Button variant="outline" size="sm">
              <Link href="/dashboard">{t("common.back")}</Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">{t("order.viewOrder")}</h1>
              <span className="text-[10px] text-muted-foreground font-bold">
                Order ID: {order.id.slice(0, 8)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status badge */}
            <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass()}`}>
              {t(`order.status.${isPushed ? "PUSHED" : order.status}`)}
            </Badge>

            {/* Download & Print (completed + pushed only) */}
            {(isCompleted || isPushed) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintOrder(true)}
                  className="flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintOrder()}
                  className="flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </Button>
              </>
            )}

            {/* Push CTA for Completed Order */}
            {isCompleted && !isPushed && canPush && (
              <Button
                size="sm"
                onClick={handlePush}
                disabled={pushMutation.isPending}
                className="flex items-center gap-1"
              >
                {pushMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle className="w-3 h-3" />
                )}
                <span>Push</span>
              </Button>
            )}
          </div>
        </div>

        {/* PO Sync Alert Banners */}
        {isPushed && order.purchaseOrderDetails && (
          <div className="space-y-3">
            {order.purchaseOrderDetails.status === "CANCELLED" && (
              <Card className="rounded-md ring-0 border border-destructive/20 bg-destructive/10 py-0 animate-fade-in">
                <CardContent className="p-4 flex items-start gap-3 text-xs font-bold text-destructive px-4">
                  <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="font-extrabold uppercase tracking-wider text-[10px]">Purchase Order Cancelled in Dealuz</h4>
                    <p className="text-muted-foreground font-semibold">
                      The linked purchase order reference <span className="text-foreground underline">#{order.purchaseOrderId?.slice(0, 8)}</span> has been cancelled in the main Dealuz client.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {order.purchaseOrderDetails.items.some(i => i.returnedQuantity > 0) && (
              <Card className="rounded-md ring-0 border border-amber-500/20 bg-amber-500/10 py-0 animate-fade-in">
                <CardContent className="p-4 flex items-start gap-3 text-xs font-bold text-amber-600 dark:text-amber-400 px-4">
                  <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-500 animate-bounce" />
                  <div className="space-y-1">
                    <h4 className="font-extrabold uppercase tracking-wider text-[10px]">Items Returned in Dealuz</h4>
                    <p className="text-muted-foreground font-semibold">Some items in this order have been returned via Dealuz:</p>
                    <ul className="list-disc pl-4 space-y-1 mt-1 text-foreground font-extrabold">
                      {order.purchaseOrderDetails.items
                        .filter(i => i.returnedQuantity > 0)
                        .map((retItem, idx) => {
                          const originalItem = order.items.find(oi => oi.productId === retItem.productId);
                          const pName = originalItem?.product.name || "Unknown Product";
                          const uSymbol = originalItem?.uom.symbol || "units";
                          return (
                            <li key={idx}>
                              {retItem.returnedQuantity} {uSymbol} of <span className="underline">{pName}</span> returned (out of {retItem.quantitySold} sold)
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Mobile Tabs */}
        <div className="lg:hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "intake" | "pad")}>
            <TabsList className="w-full h-11">
              <TabsTrigger value="intake" className="flex-1 text-xs font-bold">
                {isPushed ? "Order Info" : (t("order.addProduct") || "Add Product")}
              </TabsTrigger>
              <TabsTrigger value="pad" className="flex-1 text-xs font-bold flex items-center gap-1.5">
                <span>{t("order.orderItems") || "Order Pad"}</span>
                {items.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {items.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT COLUMN */}
          <div className={`lg:col-span-7 space-y-5 ${activeTab === "intake" ? "block" : "hidden lg:block"}`}>

            {/* Customer Details */}
            <Card className="rounded-md ring-0 border border-border py-0 overflow-visible">
              <CardContent className="p-5 space-y-3 relative px-5">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("order.customer")}
                </h2>

                {isPushed ? (
                  <Input
                    type="text"
                    value={customerName}
                    disabled
                    className="h-9 disabled:opacity-75"
                  />
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setCustomerSearch(e.target.value);
                          setSelectedCustomerId(null);
                          setCustomerDropdownOpen(true);
                        }}
                        onFocus={() => {
                          setCustomerSearch(customerName);
                          setCustomerDropdownOpen(true);
                        }}
                        placeholder={t("order.customerPlaceholder")}
                        className="h-9"
                      />

                      {customerDropdownOpen && (isCustomersLoading || filteredCustomers.length > 0 || customerSearch.trim()) && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setCustomerDropdownOpen(false)} />
                          <ul className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto divide-y divide-border">
                            {isCustomersLoading ? (
                              <li className="px-3 py-2.5 text-xs text-muted-foreground font-bold">
                                Loading customers...
                              </li>
                            ) : filteredCustomers.length > 0 ? (
                              filteredCustomers.map((c) => (
                                <li
                                  key={c.id}
                                  onClick={() => {
                                    setCustomerName(c.name);
                                    setSelectedCustomerId(c.id);
                                    setCustomerDropdownOpen(false);
                                  }}
                                  className="px-3 py-2.5 text-xs hover:bg-muted cursor-pointer font-bold transition-all text-foreground"
                                >
                                  {c.name}
                                </li>
                              ))
                            ) : (
                              <li className="px-3 py-2.5 text-xs text-muted-foreground font-bold">
                                No customers found
                              </li>
                            )}
                          </ul>
                        </>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomerName(t("order.walkIn"));
                        setSelectedCustomerId(null);
                        setCustomerDropdownOpen(false);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>{t("order.walkIn")}</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Addition Form (only if not pushed) */}
            {!isPushed && (
              <Card className="rounded-md ring-0 border border-border py-0 overflow-visible">
                <CardContent className="p-5 space-y-4 px-5">
                  <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("order.addProduct")}
                  </h2>

                  {/* Product search */}
                  <div className="relative">
                    <Label className="text-[10px] font-bold text-muted-foreground mb-1 block uppercase tracking-wide">
                      {t("order.product")}
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                      <Input
                        type="text"
                        value={productSearch || (selectedProduct ? selectedProduct.name : "")}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setSelectedProduct(null);
                          setProductDropdownOpen(true);
                        }}
                        onFocus={() => setProductDropdownOpen(true)}
                        placeholder={t("order.productPlaceholder")}
                        className="pl-9 pr-9 h-9"
                      />
                      {isProductsLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {selectedProduct && !isProductsLoading && (
                        <button
                          onClick={() => { setSelectedProduct(null); setProductSearch(""); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {productDropdownOpen && (isProductsLoading || filteredProducts.length > 0 || productSearch.trim()) && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setProductDropdownOpen(false)} />
                        <ul className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-56 overflow-y-auto divide-y divide-border">
                          {isProductsLoading ? (
                            <li className="px-3 py-2.5 text-xs text-muted-foreground font-bold">
                              Loading products...
                            </li>
                          ) : filteredProducts.length > 0 ? (
                            filteredProducts.map((p) => (
                              <li
                                key={p.id}
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setProductSearch("");
                                  setProductDropdownOpen(false);
                                }}
                                className="px-3 py-2.5 text-xs hover:bg-muted cursor-pointer flex justify-between items-center transition-all text-foreground font-bold"
                              >
                                <span>{p.name}</span>
                                <span className="text-[9px] font-extrabold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md">
                                  {Number(p.sellingPrice).toLocaleString()} {t("common.rwf")} / {p.uom.symbol}
                                </span>
                              </li>
                            ))
                          ) : (
                            <li className="px-3 py-2.5 text-xs text-muted-foreground font-bold">
                              No products found
                            </li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>

                  {/* Stock availability */}
                  {selectedProduct && (
                    <div className="animate-fade-in">
                      {isCheckingStock ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold pl-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Checking stock availability...</span>
                        </div>
                      ) : availableStock !== null ? (
                        quantity !== "" && Number(quantity) > availableStock ? (
                          <div className="bg-destructive/10 text-destructive border border-destructive/20 px-3 py-2 rounded-md flex items-start gap-2 text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>
                              {t("order.stockWarning", { available: availableStock, uom: selectedProduct.uom.symbol })}
                            </span>
                          </div>
                        ) : (
                          <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold pl-1 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" />
                            <span>
                              {t("order.stockOk", { available: availableStock, uom: selectedProduct.uom.symbol })}
                            </span>
                          </div>
                        )
                      ) : null}
                    </div>
                  )}

                  {/* Qty, UoM, Price */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        {t("order.quantity")}{" "}
                        {availableStock !== null && (
                          <span className="text-primary normal-case font-extrabold animate-fade-in">
                            (Avail: {availableStock} {compatibleUoms.find(u => u.id === selectedUomId)?.symbol || selectedProduct?.uom?.symbol})
                          </span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0.00"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        {t("order.uom") || "UoM"}
                      </Label>
                      {selectedProduct && compatibleUoms.length > 0 ? (
                        <Select
                          value={selectedUomId}
                          onValueChange={(value) => {
                            if (value) setSelectedUomId(value);
                          }}
                        >
                          <SelectTrigger className="h-9 w-full text-sm font-bold">
                            <SelectValue>
                              {(value) =>
                                compatibleUoms.find((u) => u.id === value)?.symbol ||
                                selectedProduct?.uom?.symbol ||
                                value
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {compatibleUoms.map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.symbol}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type="text"
                          disabled
                          value={selectedProduct ? selectedProduct.uom?.symbol : t("order.uom")}
                          className="h-9 bg-muted text-muted-foreground"
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        {t("order.unitPrice")}
                      </Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Transport toggle */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                        <Truck className="w-4 h-4 text-blue-500" />
                        <span>{t("order.transport")}</span>
                      </Label>
                      <Switch
                        checked={hasTransport}
                        onCheckedChange={handleTransportToggle}
                      />
                    </div>

                    {hasTransport && (
                      <div className="space-y-1.5 animate-slide-down">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                          {t("order.transportPrice")}
                        </Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={transportPrice}
                          onChange={(e) => setTransportPrice(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="0"
                          className="h-9 border-blue-200/60 focus-visible:ring-blue-500/30"
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold animate-fade-in"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t("order.addBtn")}</span>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Audit Trail */}
            <Card className="rounded-md ring-0 border border-border py-0">
              <CardContent className="p-5 space-y-4 px-5">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2.5">
                  Audit Trail Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserIcon className="w-4 h-4 animate-pulse" />
                      <span>{t("order.createdBy")}:</span>
                      <span className="text-foreground">{order.createdBy.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{t("order.createdAt")}:</span>
                      <span className="text-foreground">
                        {dayjs(order.createdAt).format("YYYY-MM-DD hh:mm A")}
                      </span>
                    </div>
                  </div>

                  {isPushed && (
                    <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserIcon className="w-4 h-4 text-emerald-500" />
                        <span>{t("order.pushedBy")}:</span>
                        <span className="text-foreground">{order.pushedBy?.fullName || "System"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <span>{t("order.pushedAt")}:</span>
                        <span className="text-foreground">
                          {dayjs(order.pushedAt).format("YYYY-MM-DD hh:mm A")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dealuz Reference Link */}
                {isPushed && order.purchaseOrderId && (
                  <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-4 py-3 rounded-md flex items-center justify-between text-xs font-bold mt-2 animate-fade-in">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>{t("order.purchaseOrderRef")}:</span>
                      <span className="underline font-extrabold">{order.purchaseOrderId.slice(0, 8)}</span>
                    </span>
                    <Link
                      href={`${dealuzClientUrl}/dashboard/purchase-orders/${order.purchaseOrderId}`}
                      target="_blank"
                      className="flex items-center gap-1 hover:text-emerald-500 font-extrabold transition-all"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Items list + totals */}
          <div className={`lg:col-span-5 space-y-6 ${activeTab === "pad" ? "block" : "hidden lg:block"}`}>
            <Card className="rounded-md ring-0 border border-border py-0">
              <CardContent className="p-5 flex flex-col justify-between min-h-[400px] px-5">
                <div className="space-y-4">
                  <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2.5">
                    {t("order.orderItems")}
                  </h2>

                  <div className="divide-y divide-border max-h-72 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs truncate text-foreground">{item.productName}</h4>
                          <span className="text-[10px] text-muted-foreground font-bold block mt-1">
                            {item.quantity} {item.uomSymbol} × {item.unitPrice.toLocaleString()} {t("common.rwf")}
                            {item.transportPrice > 0 && ` (+ ${item.transportPrice.toLocaleString()} transport)`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-foreground mr-1.5">
                            {item.lineTotal.toLocaleString()}
                          </span>
                          {!isPushed && (
                            <>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={() => handleEditItem(item)}
                                title={t("common.edit") || "Edit"}
                                className="hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={() => handleRemoveItem(item.id)}
                                title={t("order.remove")}
                                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals + Notes + Actions */}
                <div className="border-t border-border pt-3.5 mt-5 space-y-3.5">
                  <div className="space-y-1.5 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("order.subtotal")}</span>
                      <span className="text-foreground">{totals.subtotal.toLocaleString()} {t("common.rwf")}</span>
                    </div>
                    {totals.transportTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("order.transportTotal")}</span>
                        <span className="text-foreground">{totals.transportTotal.toLocaleString()} {t("common.rwf")}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border pt-2 text-sm font-extrabold">
                      <span>{t("order.grandTotal")}</span>
                      <span className="text-primary">{totals.totalAmount.toLocaleString()} {t("common.rwf")}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      {t("order.notes")}
                    </Label>
                    <Textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => !isPushed && setNotes(e.target.value)}
                      disabled={isPushed}
                      placeholder="Enter order details, driver name, etc..."
                      className="text-xs sm:text-sm resize-none disabled:opacity-75"
                    />
                  </div>

                  {/* Save/Complete buttons */}
                  {!isPushed && (
                    <div className="grid grid-cols-2 gap-3.5 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleUpdate("DRAFT")}
                        disabled={saveChangesMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        {saveChangesMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileCheck className="w-4 h-4" />
                        )}
                        <span>{t("order.saveDraft")}</span>
                      </Button>

                      <Button
                        type="button"
                        onClick={() => handleUpdate("COMPLETED")}
                        disabled={saveChangesMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        {saveChangesMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        <span>{t("order.complete")}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
