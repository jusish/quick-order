"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { KeyRound, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(4, { message: "Password must be at least 4 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    const result = await login(data);
    if (result.success) {
      toast.success(t("auth.welcomeBack"));
      router.push("/dashboard");
    } else {
      toast.error(result.message || t("auth.loginError"));
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Decorative background glow using theme oklch colors */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-sub-primary/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/Logo.svg"
            alt="Dealuz"
            width={36}
            height={36}
            className="rounded-md shadow-lg shadow-primary/10"
            priority
          />
          <span className="font-extrabold text-lg tracking-tight text-foreground">
            {t("app.name")}
          </span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card text-card-foreground border border-border rounded-md p-8 md:p-10 shadow-xl shadow-foreground/5 backdrop-blur-md">
            {/* Logo and title */}
            <div className="flex flex-col items-center text-center mb-8">
              <Image
                src="/Logo.svg"
                alt="Dealuz"
                width={56}
                height={56}
                className="mb-4 rounded-md shadow-xl shadow-primary/10"
                priority
              />
              <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">
                {t("app.name")}
              </h1>
              <p className="text-muted-foreground text-xs font-semibold">
                {t("auth.loginDesc")}
              </p>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    {...register("email")}
                    suppressHydrationWarning
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-md text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="manager@dealuz.com"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive font-semibold pl-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    suppressHydrationWarning
                    className="w-full pl-10 pr-12 py-2.5 bg-background border border-input rounded-md text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    suppressHydrationWarning
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive font-semibold pl-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                suppressHydrationWarning
                className="relative w-full py-3 px-4 bg-primary hover:bg-primary/90 active:scale-[0.98] disabled:scale-100 disabled:opacity-50 text-primary-foreground font-bold rounded-md shadow-lg shadow-primary/10 overflow-hidden transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>{t("auth.loggingIn")}</span>
                  </>
                ) : (
                  <span>{t("auth.loginButton")}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground font-semibold">
        © {new Date().getFullYear()} Dealuz. {t("app.tagline")}.
      </footer>
    </div>
  );
}
