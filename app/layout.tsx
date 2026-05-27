import "./globals.css";
import { Inter, Geist } from "next/font/google";
import { Providers } from "./[locale]/providers";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: "QuickOrder — Shop Intake Terminal",
  description: "Fast and lightweight order intake terminal for Dealuz",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground font-sans flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
