"use client";

import * as React from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuthStore } from "@/stores/auth.store";
import { quickOrderService, CreateQuickOrderDto, QuickOrderItemDto } from "@/services/quick-order.service";
import { productService, Product } from "@/services/product.service";
import { customerService, Customer } from "@/services/customer.service";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
  Sparkles,
  ArrowLeft,
  X,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

// Shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export default function NewOrderPage() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedStockId } = useAuthStore();

  // Core order states
  const [customerName, setCustomerName] = React.useState("");
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<ItemTemp[]>([]);
  const [orderId, setOrderId] = React.useState<string | null>(null);

  // Product combobox states
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = React.useState(false);
  const [productSearch, setProductSearch] = React.useState("");
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [productDropdownOpen, setProductDropdownOpen] = React.useState(false);

  const [quantity, setQuantity] = React.useState<number | "">("");
  const [unitPrice, setUnitPrice] = React.useState<number | "">("");

  const [hasTransport, setHasTransport] = React.useState(false);
  const [transportPrice, setTransportPrice] = React.useState<number | "">("");

  // Customer combobox states
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = React.useState(false);
  const [isCustomersLoading, setIsCustomersLoading] = React.useState(false);

  // Stock availability & transport memory
  const [availableStock, setAvailableStock] = React.useState<number | null>(null);
  const [isCheckingStock, setIsCheckingStock] = React.useState(false);
  const [lastTransportPrice, setLastTransportPrice] = React.useState<number>(0);

  // UoMs
  const [uoms, setUoms] = React.useState<any[]>([]);
  const [selectedUomId, setSelectedUomId] = React.useState<string>("");

  // Active tab for mobile
  const [activeTab, setActiveTab] = React.useState<"intake" | "pad">("intake");

  // Load products with debounced search
  React.useEffect(() => {
    if (!selectedStockId) return;
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
  }, [selectedStockId, productSearch]);

  // Load UoMs
  React.useEffect(() => {
    const loadUoms = async () => {
      if (!selectedStockId) return;
      try {
        const url = selectedStockId === "all"
          ? `/unit-of-measure/stock`
          : `/unit-of-measure/stock/${selectedStockId}`;
        const res = await api.get(url);
        if (res.data?.success && res.data?.data) {
          setUoms(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load UoMs", err);
      }
    };
    loadUoms();
  }, [selectedStockId]);

  // Load customers with debounced search
  React.useEffect(() => {
    const loadCustomers = async () => {
      setIsCustomersLoading(true);
      try {
        const list = await customerService.getCustomers(customerName);
        setCustomers(list);
      } catch (e) {
        // ignore
      } finally {
        setIsCustomersLoading(false);
      }
    };
    const handler = setTimeout(() => { loadCustomers(); }, 300);
    return () => clearTimeout(handler);
  }, [customerName]);

  // Check stock availability and transport price
  React.useEffect(() => {
    if (!selectedProduct || !selectedStockId) {
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
        } else {
          setLastTransportPrice(0);
        }
      } catch (err) {
        // ignore
      } finally {
        setIsCheckingStock(false);
      }
    };
    checkDetails();
  }, [selectedProduct, selectedStockId, hasTransport]);

  // Pre-fill price/UoM on product select
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

  const filteredProducts = React.useMemo(() => products.slice(0, 100), [products]);
  const filteredCustomers = React.useMemo(() => customers.slice(0, 5), [customers]);

  const selectedProductUom = React.useMemo(() => {
    if (!selectedProduct || uoms.length === 0) return null;
    return uoms.find((u) => u.id === selectedProduct.uomId);
  }, [selectedProduct, uoms]);

  const compatibleUoms = React.useMemo(() => {
    if (!selectedProductUom) return [];
    return uoms.filter((u) => u.category === selectedProductUom.category && u.status === "ENABLED");
  }, [selectedProductUom, uoms]);

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.warning("Please select a product");
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      toast.warning(t("errors.minQuantity"));
      return;
    }
    if (unitPrice === "" || Number(unitPrice) < 0) {
      toast.warning(t("errors.minPrice"));
      return;
    }

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

  const saveOrderMutation = useMutation({
    mutationFn: async (status: "DRAFT" | "COMPLETED") => {
      if (!selectedStockId) throw new Error();
      const notesString = selectedCustomerId
        ? `[CustomerId: ${selectedCustomerId}]${notes.trim()}`
        : notes.trim();

      const payloadStockId = selectedStockId === "all"
        ? items[0].stockId
        : selectedStockId;

      const orderPayload: CreateQuickOrderDto = {
        title: customerName.trim() || "Walk-In Customer",
        stockId: payloadStockId,
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

      if (orderId) {
        return quickOrderService.updateQuickOrder(orderId, orderPayload);
      } else {
        return quickOrderService.createQuickOrder(orderPayload);
      }
    },
    onSuccess: (res, status) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["quickOrders"] });
        if (status === "DRAFT") {
          setOrderId(res.data.id);
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

  const handleSaveDraft = () => {
    if (items.length === 0) { toast.warning(t("order.noItems")); return; }
    saveOrderMutation.mutate("DRAFT");
  };

  const handleCompleteOrder = () => {
    if (items.length === 0) { toast.warning(t("order.noItems")); return; }
    saveOrderMutation.mutate("COMPLETED");
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-extrabold tracking-tight">{t("order.newOrder")}</h1>
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "intake" | "pad")}>
            <TabsList className="w-full h-11">
              <TabsTrigger value="intake" className="flex-1 text-xs font-bold">
                {t("order.addProduct") || "Add Product"}
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

          {/* LEFT: Customer + Product form */}
          <div className={`lg:col-span-7 space-y-5 ${activeTab === "intake" ? "block" : "hidden lg:block"}`}>

            {/* Customer Section */}
            <Card className="rounded-md ring-0 border border-border py-0 overflow-visible">
              <CardContent className="p-5 space-y-3 relative px-5">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  1. {t("order.customer")}
                </h2>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setSelectedCustomerId(null);
                        setCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setCustomerDropdownOpen(true)}
                      placeholder={t("order.customerPlaceholder")}
                      className="h-9"
                    />

                    {customerDropdownOpen && (isCustomersLoading || filteredCustomers.length > 0 || customerName.trim()) && (
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
              </CardContent>
            </Card>

            {/* Product Intake Form */}
            <Card className="rounded-md ring-0 border border-border py-0 overflow-visible">
              <CardContent className="p-5 space-y-4 px-5">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  2. {t("order.addProduct")}
                </h2>

                {/* Product search combobox */}
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

                {/* Stock availability info */}
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
                      {lastTransportPrice > 0 && (
                        <span className="text-[9px] font-bold text-blue-500 block pl-1">
                          ✓ Last transport price used: {lastTransportPrice.toLocaleString()} {t("common.rwf")}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Add Item button */}
                <Button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/15"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t("order.addBtn")}</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Order pad */}
          <div className={`lg:col-span-5 space-y-5 ${activeTab === "pad" ? "block" : "hidden lg:block"}`}>
            <Card className="rounded-md ring-0 border border-border py-0">
              <CardContent className="p-5 space-y-4 flex flex-col justify-between min-h-[400px] px-5">
                <div className="space-y-4">
                  <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2.5">
                    {t("order.orderItems")}
                  </h2>

                  {items.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-6">
                      <ShoppingCart className="w-10 h-10 text-muted-foreground/60 stroke-[1.5] mb-2" />
                      <span className="text-xs font-bold text-muted-foreground">{t("order.noItems")}</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-border max-h-72 overflow-y-auto pr-1">
                      {items.map((item) => (
                        <div key={item.id} className="py-3 flex items-center justify-between gap-4 group">
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter order details, driver name, etc..."
                      className="text-xs sm:text-sm resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={saveOrderMutation.isPending}
                      className="flex items-center gap-1"
                    >
                      {saveOrderMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileCheck className="w-4 h-4" />
                      )}
                      <span>{t("order.saveDraft")}</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={handleCompleteOrder}
                      disabled={saveOrderMutation.isPending}
                      className="flex items-center gap-1"
                    >
                      {saveOrderMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      <span>{t("order.complete")}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
