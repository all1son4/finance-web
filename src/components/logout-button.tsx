"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { requestJson } from "@/lib/client-api";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    try {
      setError("");
      await requestJson("/api/logout", {
        method: "POST",
      });

      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Не удалось выйти.",
      );
    }
  }

  return (
    <div className="logout-stack">
      <button className="button button-ghost button-with-icon" onClick={handleLogout} type="button">
        <LogOut size={18} />
        {isPending ? "Выходим..." : "Выйти"}
      </button>
      {error ? <p className="inline-error">{error}</p> : null}
    </div>
  );
}
