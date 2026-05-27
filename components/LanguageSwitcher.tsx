"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
  rw: "Kinyarwanda",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string | null) => {
    if (!newLocale) return;
    // Replace locale segment in pathname (e.g. /en/dashboard -> /fr/dashboard)
    const currentPathWithoutLocale = pathname.replace(/^\/(en|fr|rw)(\/|$)/, "/");
    router.push(`/${newLocale}${currentPathWithoutLocale}`);
  };

  return (
    <div className="flex items-center gap-1.5" suppressHydrationWarning>
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={locale} onValueChange={handleLanguageChange}>
        <SelectTrigger className="h-8 w-auto min-w-[110px] border-input bg-background px-2.5 text-xs font-bold shadow-none focus-visible:ring-1 focus-visible:ring-primary">
          <SelectValue>
            {(value) => LOCALE_LABELS[String(value)] ?? String(value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(LOCALE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
