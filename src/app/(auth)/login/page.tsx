import { redirect } from "next/navigation";

import { getCurrentUser, isSetupComplete } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const [setupComplete, currentUser] = await Promise.all([
    isSetupComplete(),
    getCurrentUser(),
  ]);

  if (!setupComplete) {
    redirect("/setup");
  }

  if (currentUser) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
