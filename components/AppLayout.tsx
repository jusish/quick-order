"use client";
// Shadcn v4 / base-ui does not support asChild; use buttonVariants with Link

import * as React from "react";
import { useAuthStore } from "@/stores/auth.store";
import { stockService, Stock } from "@/services/stock.service";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import {
  LogOut,
  PlusCircle,
  LayoutDashboard,
  Loader2,
  Building2,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { user, selectedStockId, setSelectedStockId, logout, checkAuth } = useAuthStore();
  const { theme, setTheme } = useTheme();

  const [stocks, setStocks] = React.useState<Stock[]>([]);
  const [isStocksLoading, setIsStocksLoading] = React.useState(true);
  const [isAuthChecking, setIsAuthChecking] = React.useState(true);

  // Clean pathname for active links
  const pathWithoutLocale = pathname.replace(/^\/(en|fr|rw)(\/|$)/, "/");

  React.useEffect(() => {
    const init = async () => {
      // Validate profile
      const loggedUser = await checkAuth();
      if (!loggedUser) {
        document.cookie = "AUTH_SESSION_FLAG=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        setIsAuthChecking(false);
        toast.error(t("errors.unauthorized"));
        router.push("/login");
        return;
      }
      setIsAuthChecking(false);

      // Load stocks
      try {
        const loadedStocks = await stockService.getStocks();
        setStocks(loadedStocks);
        if (loadedStocks.length > 0) {
          const currentSelected = useAuthStore.getState().selectedStockId;
          if (!currentSelected || (currentSelected !== "all" && !loadedStocks.some((s) => s.id === currentSelected))) {
            setSelectedStockId(loadedStocks[0].id);
          }
        } else {
          toast.warning(t("errors.noStock"));
        }
      } catch (err) {
        toast.error(t("errors.network"));
      } finally {
        setIsStocksLoading(false);
      }
    };

    init();
  }, []);

  const handleStockChange = (value: string | null) => {
    if (!value) return;
    setSelectedStockId(value);
    toast.info(value === "all" ? "Switched to All Stocks" : `Switched stock to ${stocks.find((s) => s.id === value)?.name}`);
  };

  if (isAuthChecking || (isStocksLoading && stocks.length === 0)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs font-bold text-muted-foreground">
          {t("common.loading")}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Stock select */}
          <div className="flex items-center gap-4 sm:gap-6 self-start md:self-auto">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Image
                src="/Logo.svg"
                alt="Dealuz"
                width={28}
                height={28}
                className="shrink-0"
              />
              <span className="font-extrabold text-lg tracking-tight hidden sm:inline">
                {t("app.name")}
              </span>
            </Link>

            <span className="h-6 w-[1px] bg-border hidden sm:inline" />

            {/* Stock Switcher */}
            {stocks.length > 0 ? (
              <div className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 border border-border">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Select value={selectedStockId || ""} onValueChange={handleStockChange}>
                  <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-xs sm:text-sm font-bold shadow-none focus-visible:ring-0 w-auto min-w-[80px]">
                    <SelectValue>
                      {(value) => value === "all" ? "All Stocks" : (stocks.find((stock) => stock.id === value)?.name ?? value)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stocks</SelectItem>
                    {stocks.map((stock) => (
                      <SelectItem key={stock.id} value={stock.id}>
                        {stock.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-xs font-bold text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md border border-destructive/20">
                {t("errors.noStock")}
              </div>
            )}
          </div>

          {/* Navigation & Controls */}
          <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 sm:gap-4 border-t border-border md:border-none pt-3 md:pt-0">
            {/* Quick Action Navigation links */}
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className={buttonVariants({
                  variant: pathWithoutLocale === "/dashboard" ? "default" : "ghost",
                  size: "sm",
                }) + " flex items-center gap-1.5"}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">{t("nav.dashboard")}</span>
              </Link>
              <Link
                href="/orders/new"
                className={buttonVariants({
                  variant: pathWithoutLocale.startsWith("/orders/new") ? "default" : "ghost",
                  size: "sm",
                }) + " flex items-center gap-1.5"}
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t("nav.newOrder")}</span>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              <LanguageSwitcher />

              {/* User info & Logout */}
              <div className="flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold leading-none">
                    {user?.fullName}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground leading-none mt-1 uppercase tracking-wider">
                    {user?.role === "STOCK_OWNER"
                      ? "Owner"
                      : user?.role === "STOCK_MANAGER"
                      ? "Manager"
                      : "Admin"}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={logout}
                  title={t("auth.logout")}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {stocks.length > 0 ? (
          children
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-card rounded-md border border-border">
            <Building2 className="w-12 h-12 text-destructive mb-3 stroke-[1.5]" />
            <h2 className="text-lg font-bold mb-1.5">{t("errors.noStock")}</h2>
            <p className="text-muted-foreground text-xs font-bold max-w-sm">
              Please contact your administrator to assign you to a stock before taking orders.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border transition-colors py-4 text-center text-xs text-muted-foreground font-bold">
        © {new Date().getFullYear()} Dealuz. {t("app.tagline")}.
      </footer>
    </div>
  );
}
