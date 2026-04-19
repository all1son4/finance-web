import { redirect } from "next/navigation";

import { getCurrentUser, isSetupComplete } from "@/lib/auth";
import { SetupForm } from "@/components/setup-form";

export default async function SetupPage() {
  const [setupComplete, currentUser] = await Promise.all([
    isSetupComplete(),
    getCurrentUser(),
  ]);

  if (setupComplete) {
    if (currentUser) {
      redirect("/dashboard");
    }

    redirect("/login");
  }

  return <SetupForm />;
}
