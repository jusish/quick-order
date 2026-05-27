import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr", "rw"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});
