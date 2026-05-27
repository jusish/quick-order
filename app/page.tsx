import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware handles this, but in case of manual bypass, redirect to dashboard
  redirect("/dashboard");
}
