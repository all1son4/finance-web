import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { SetupForm } from "@/components/setup-form";

export default async function SetupPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  return <SetupForm />;
}
